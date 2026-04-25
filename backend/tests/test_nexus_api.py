"""Nexus 001 API regression tests — auth, users, transactions, nudges, insights."""
import os
import time
import pytest
import requests
from pymongo import MongoClient
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://hostel-loans.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")


@pytest.fixture(scope="session")
def db():
    return MongoClient(MONGO_URL)[DB_NAME]


@pytest.fixture(scope="session")
def seed(db):
    """Seed a unique test user + session, yield bearer token; cleanup at end."""
    ts = int(time.time() * 1000)
    user_id = f"test-user-{ts}"
    token = f"test_session_{ts}"
    db.users.insert_one({
        "user_id": user_id,
        "email": f"test.user.{ts}@example.com",
        "name": "Test User",
        "picture": "https://via.placeholder.com/150",
        "college": "IIT Bombay",
        "branch": "CSE",
        "upi_id": "test@okaxis",
        "whatsapp_session_active": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc),
    })
    yield {"user_id": user_id, "token": token}
    # Cleanup
    db.transactions.delete_many({"user_id": user_id})
    db.nudge_logs.delete_many({"user_id": user_id})
    db.user_sessions.delete_many({"user_id": user_id})
    db.users.delete_one({"user_id": user_id})


@pytest.fixture(scope="session")
def client(seed):
    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {seed['token']}",
    })
    return s


# ===== AUTH =====
class TestAuth:
    def test_me_returns_user(self, client):
        r = client.get(f"{API}/auth/me")
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["email"].startswith("test.user.")
        assert d["onboarded"] is True
        assert d["upi_id"] == "test@okaxis"
        assert d["has_email_creds"] is False

    def test_me_unauth(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_session_missing_id(self, client):
        r = client.post(f"{API}/auth/session", json={})
        assert r.status_code == 400


# ===== USERS =====
class TestUsers:
    def test_profile_update(self, client):
        r = client.put(f"{API}/users/profile", json={"college": "NIT Trichy"})
        assert r.status_code == 200
        assert r.json()["college"] == "NIT Trichy"
        # persistence
        me = client.get(f"{API}/auth/me").json()
        assert me["college"] == "NIT Trichy"

    def test_qr_returns_base64(self, client):
        r = client.get(f"{API}/users/qr")
        assert r.status_code == 200
        d = r.json()
        assert d["upi_link"].startswith("upi://pay?")
        assert d["qr_base64"].startswith("data:image/png;base64,")

    def test_email_test_no_creds_returns_400(self, client):
        r = client.post(f"{API}/users/email-test")
        assert r.status_code == 400

    def test_email_settings_persist(self, client):
        r = client.put(f"{API}/users/email-settings", json={
            "gmail_address": "lender@example.com",
            "gmail_app_password": "fake-app-password-1234",
        })
        assert r.status_code == 200
        d = r.json()
        assert d["gmail_address"] == "lender@example.com"
        assert d["has_email_creds"] is True

    def test_export(self, client):
        r = client.get(f"{API}/users/export")
        assert r.status_code == 200
        assert "transactions" in r.json()


# ===== TRANSACTIONS =====
@pytest.fixture(scope="session")
def created_txns(client):
    """Seed: one overdue (LOAN), one pending future (FOOD)."""
    today = datetime.now(timezone.utc).date()
    overdue_due = (today - timedelta(days=10)).isoformat()
    pending_due = (today + timedelta(days=10)).isoformat()
    t1 = client.post(f"{API}/transactions", json={
        "borrower_name": "Rahul Sharma", "borrower_phone": "9876543210",
        "borrower_email": "rahul@example.com",
        "amount": 1500, "due_date": overdue_due, "category": "LOAN",
    }).json()
    t2 = client.post(f"{API}/transactions", json={
        "borrower_name": "Priya K", "borrower_phone": "9123456780",
        "amount": 250, "due_date": pending_due, "category": "FOOD",
    }).json()
    return {"overdue": t1, "pending": t2}


class TestTransactions:
    def test_create_status_overdue(self, created_txns):
        assert created_txns["overdue"]["status"] == "Overdue"
        assert created_txns["overdue"]["initials"] == "RS"
        assert created_txns["overdue"]["avatar_color"].startswith("#")

    def test_create_status_pending(self, created_txns):
        assert created_txns["pending"]["status"] == "Pending"

    def test_list_filters(self, client, created_txns):
        r = client.get(f"{API}/transactions?status=Overdue")
        assert r.status_code == 200
        ids = [t["id"] for t in r.json()]
        assert created_txns["overdue"]["id"] in ids
        assert created_txns["pending"]["id"] not in ids

        r2 = client.get(f"{API}/transactions?category=FOOD")
        assert r2.status_code == 200
        ids2 = [t["id"] for t in r2.json()]
        assert created_txns["pending"]["id"] in ids2

    def test_update_mark_paid(self, client, created_txns):
        tid = created_txns["pending"]["id"]
        r = client.put(f"{API}/transactions/{tid}", json={"status": "Paid"})
        assert r.status_code == 200
        assert r.json()["status"] == "Paid"

    def test_transaction_qr(self, client, created_txns):
        tid = created_txns["overdue"]["id"]
        r = client.get(f"{API}/transactions/{tid}/qr")
        assert r.status_code == 200
        d = r.json()
        assert d["qr_base64"].startswith("data:image/png;base64,")
        assert d["amount"] == 1500
        assert "am=1500.00" in d["upi_link"]


# ===== NUDGES =====
class TestNudges:
    def test_preview(self, client, created_txns):
        tid = created_txns["overdue"]["id"]
        r = client.get(f"{API}/nudge/preview/{tid}")
        assert r.status_code == 200
        d = r.json()
        assert d["level"] == 0
        assert d["days_overdue"] >= 9
        assert "Rahul" in d["whatsapp_message"]
        assert "₹1,500" in d["whatsapp_message"]
        assert d["email_subject"]

    def test_whatsapp_send_increments(self, client, created_txns):
        tid = created_txns["overdue"]["id"]
        r = client.post(f"{API}/nudge/whatsapp/{tid}", json={"message": "Hey Rahul, please pay.", "level": 0})
        assert r.status_code == 200
        d = r.json()
        assert d["wa_link"].startswith("https://wa.me/919876543210?text=")
        # check increment
        txn = next(t for t in client.get(f"{API}/transactions").json() if t["id"] == tid)
        assert txn["nudge_count"] >= 1
        assert txn["last_nudge_channel"] == "whatsapp"

    def test_email_no_borrower_email_400(self, client, created_txns):
        # pending was marked paid; create a new without email
        today = datetime.now(timezone.utc).date()
        t = client.post(f"{API}/transactions", json={
            "borrower_name": "NoEmail Guy", "borrower_phone": "9000000000",
            "amount": 100, "due_date": (today - timedelta(days=2)).isoformat(),
            "category": "TRAVEL",
        }).json()
        r = client.post(f"{API}/nudge/email/{t['id']}", json={"message": "hi", "level": 0})
        assert r.status_code == 400

    def test_email_no_creds_400_when_borrower_has_email(self, client, db, seed, created_txns):
        # Reset email creds to ensure 400 branch is exercised
        db.users.update_one({"user_id": seed["user_id"]},
                             {"$unset": {"gmail_address": "", "gmail_app_password_enc": ""}})
        tid = created_txns["overdue"]["id"]
        r = client.post(f"{API}/nudge/email/{tid}", json={"message": "hi", "level": 0})
        assert r.status_code == 400
        assert "Gmail" in r.json()["detail"] or "configure" in r.json()["detail"].lower()

    def test_log_returns_entries(self, client):
        r = client.get(f"{API}/nudge/log")
        assert r.status_code == 200
        logs = r.json()
        assert isinstance(logs, list)
        assert any(l["channel"] == "whatsapp" for l in logs)


# ===== INSIGHTS =====
class TestInsights:
    def test_summary_shape(self, client):
        r = client.get(f"{API}/insights/summary")
        assert r.status_code == 200
        d = r.json()
        for k in ["total_lent", "total_recovered", "pending", "overdue",
                  "recovery_rate", "category_split", "monthly_trend", "top_borrowers"]:
            assert k in d
        # 6 months trend with unique months
        assert len(d["monthly_trend"]) == 6
        labels = [m["month"] for m in d["monthly_trend"]]
        # labels could repeat (e.g., Jan twice across years) but the (label, ym) pairs are unique
        # trust score within range
        for b in d["top_borrowers"]:
            assert 0 <= b["trust_score"] <= 100


# ===== DELETE & WHATSAPP STATUS =====
class TestMisc:
    def test_whatsapp_status(self, client):
        r = client.get(f"{API}/whatsapp/status")
        assert r.status_code == 200
        assert r.json()["mode"] == "deeplink"

    def test_delete_transaction(self, client, created_txns):
        tid = created_txns["overdue"]["id"]
        r = client.delete(f"{API}/transactions/{tid}")
        assert r.status_code == 200
        # gone
        r2 = client.put(f"{API}/transactions/{tid}", json={"status": "Paid"})
        assert r2.status_code == 404
