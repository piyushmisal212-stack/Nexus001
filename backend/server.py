"""Nexus 001 — Peer Lending Recovery Tracker (FastAPI backend)"""
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Literal
from datetime import datetime, timezone, timedelta, date
from cryptography.fernet import Fernet
import os, io, base64, uuid, logging, asyncio
from pathlib import Path
import httpx
import qrcode
from email.message import EmailMessage
import aiosmtplib

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

ENCRYPTION_KEY = os.environ['ENCRYPTION_KEY'].encode()
fernet = Fernet(ENCRYPTION_KEY)

EMERGENT_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"

app = FastAPI(title="Nexus 001 API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("nexus001")


# ==================== MODELS ====================

class UserPublic(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    college: Optional[str] = None
    branch: Optional[str] = None
    upi_id: Optional[str] = None
    gmail_address: Optional[str] = None
    has_email_creds: bool = False
    whatsapp_session_active: bool = False
    onboarded: bool = False


class OnboardIn(BaseModel):
    name: str
    college: str
    branch: str
    upi_id: str


class ProfileIn(BaseModel):
    name: Optional[str] = None
    college: Optional[str] = None
    branch: Optional[str] = None
    upi_id: Optional[str] = None


class EmailSettingsIn(BaseModel):
    gmail_address: EmailStr
    gmail_app_password: str


class TransactionIn(BaseModel):
    borrower_name: str
    borrower_phone: str
    borrower_email: Optional[str] = None
    amount: float
    due_date: str  # ISO date YYYY-MM-DD
    category: Literal["LOAN", "SHARED", "PROJECT", "FOOD", "TRAVEL"]
    notes: Optional[str] = None


class TransactionUpdate(BaseModel):
    borrower_name: Optional[str] = None
    borrower_phone: Optional[str] = None
    borrower_email: Optional[str] = None
    amount: Optional[float] = None
    due_date: Optional[str] = None
    category: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[Literal["Pending", "Overdue", "Paid"]] = None


class Transaction(BaseModel):
    id: str
    user_id: str
    borrower_name: str
    borrower_phone: str
    borrower_email: Optional[str] = None
    amount: float
    due_date: str
    category: str
    status: str
    nudge_count: int = 0
    last_nudged_at: Optional[str] = None
    last_nudge_channel: Optional[str] = None
    avatar_color: str
    initials: str
    notes: Optional[str] = None
    created_at: str


class NudgeSendIn(BaseModel):
    message: str
    level: int = 0


# ==================== HELPERS ====================

AVATAR_PALETTE = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#a855f7", "#ec4899", "#14b8a6"]


def initials_of(name: str) -> str:
    parts = [p for p in name.strip().split() if p]
    if not parts:
        return "?"
    if len(parts) == 1:
        return parts[0][:2].upper()
    return (parts[0][0] + parts[-1][0]).upper()


def compute_status(due_date: str, current: Optional[str] = None) -> str:
    if current == "Paid":
        return "Paid"
    try:
        due = date.fromisoformat(due_date)
    except Exception:
        return current or "Pending"
    if due < datetime.now(timezone.utc).date():
        return "Overdue"
    return "Pending"


def encrypt_str(s: str) -> str:
    return fernet.encrypt(s.encode()).decode()


def decrypt_str(s: str) -> str:
    return fernet.decrypt(s.encode()).decode()


def to_public_user(u: dict) -> UserPublic:
    return UserPublic(
        user_id=u["user_id"],
        email=u["email"],
        name=u.get("name", ""),
        picture=u.get("picture"),
        college=u.get("college"),
        branch=u.get("branch"),
        upi_id=u.get("upi_id"),
        gmail_address=u.get("gmail_address"),
        has_email_creds=bool(u.get("gmail_app_password_enc")),
        whatsapp_session_active=bool(u.get("whatsapp_session_active", False)),
        onboarded=bool(u.get("upi_id")),
    )


async def get_session_token(request: Request) -> Optional[str]:
    token = request.cookies.get("session_token")
    if token:
        return token
    auth = request.headers.get("Authorization") or request.headers.get("authorization")
    if auth and auth.lower().startswith("bearer "):
        return auth.split(" ", 1)[1].strip()
    return None


async def current_user(request: Request) -> dict:
    token = await get_session_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    sess = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not sess:
        raise HTTPException(status_code=401, detail="Invalid session")
    expires_at = sess.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at and expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def make_qr_b64(data: str) -> str:
    qr = qrcode.QRCode(box_size=10, border=2, error_correction=qrcode.constants.ERROR_CORRECT_M)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#0a0a0a", back_color="#ffffff")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


def upi_link(upi_id: str, name: str, amount: Optional[float] = None) -> str:
    from urllib.parse import quote_plus
    parts = [f"pa={quote_plus(upi_id)}", f"pn={quote_plus(name)}"]
    if amount is not None:
        parts.append(f"am={amount:.2f}")
    parts.append(f"tn={quote_plus('Repay to ' + name)}")
    return "upi://pay?" + "&".join(parts)


# ==================== AUTH ====================

@api_router.post("/auth/session")
async def auth_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")

    async with httpx.AsyncClient(timeout=15) as hc:
        r = await hc.get(EMERGENT_SESSION_URL, headers={"X-Session-ID": session_id})
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session_id")
    data = r.json()
    email = data["email"]
    name = data.get("name", email.split("@")[0])
    picture = data.get("picture")
    session_token = data["session_token"]

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture}},
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.update_one(
        {"session_token": session_token},
        {"$set": {
            "session_token": session_token,
            "user_id": user_id,
            "expires_at": expires_at,
            "created_at": datetime.now(timezone.utc),
        }},
        upsert=True,
    )

    response.set_cookie(
        key="session_token",
        value=session_token,
        max_age=7 * 24 * 60 * 60,
        path="/",
        httponly=True,
        secure=True,
        samesite="none",
    )

    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    pu = to_public_user(user)
    return {"user": pu.model_dump(), "session_token": session_token}


@api_router.get("/auth/me", response_model=UserPublic)
async def auth_me(user: dict = Depends(current_user)):
    return to_public_user(user)


@api_router.post("/auth/logout")
async def auth_logout(request: Request, response: Response):
    token = await get_session_token(request)
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}


# ==================== USERS ====================

@api_router.post("/users/onboard", response_model=UserPublic)
async def users_onboard(body: OnboardIn, user: dict = Depends(current_user)):
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {
            "name": body.name,
            "college": body.college,
            "branch": body.branch,
            "upi_id": body.upi_id,
        }},
    )
    u = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return to_public_user(u)


@api_router.put("/users/profile", response_model=UserPublic)
async def users_profile(body: ProfileIn, user: dict = Depends(current_user)):
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if update:
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": update})
    u = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return to_public_user(u)


@api_router.put("/users/email-settings", response_model=UserPublic)
async def users_email_settings(body: EmailSettingsIn, user: dict = Depends(current_user)):
    enc = encrypt_str(body.gmail_app_password)
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"gmail_address": body.gmail_address, "gmail_app_password_enc": enc}},
    )
    u = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return to_public_user(u)


@api_router.post("/users/email-test")
async def users_email_test(user: dict = Depends(current_user)):
    if not user.get("gmail_address") or not user.get("gmail_app_password_enc"):
        raise HTTPException(status_code=400, detail="Email not configured")
    pw = decrypt_str(user["gmail_app_password_enc"])
    msg = EmailMessage()
    msg["From"] = user["gmail_address"]
    msg["To"] = user["gmail_address"]
    msg["Subject"] = "Nexus 001 — Test Connection"
    msg.set_content("Your Gmail SMTP is connected. You can now send nudge emails from Nexus 001.")
    try:
        await aiosmtplib.send(
            msg,
            hostname="smtp.gmail.com",
            port=465,
            username=user["gmail_address"],
            password=pw,
            use_tls=True,
            timeout=15,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"SMTP failed: {e}")
    return {"ok": True}


@api_router.get("/users/qr")
async def users_qr(user: dict = Depends(current_user)):
    if not user.get("upi_id"):
        raise HTTPException(status_code=400, detail="UPI ID not set")
    link = upi_link(user["upi_id"], user.get("name", "Lender"))
    return {"upi_link": link, "qr_base64": make_qr_b64(link)}


@api_router.delete("/users/me")
async def users_delete(user: dict = Depends(current_user)):
    await db.transactions.delete_many({"user_id": user["user_id"]})
    await db.nudge_logs.delete_many({"user_id": user["user_id"]})
    await db.user_sessions.delete_many({"user_id": user["user_id"]})
    await db.users.delete_one({"user_id": user["user_id"]})
    return {"ok": True}


@api_router.get("/users/export")
async def users_export(user: dict = Depends(current_user)):
    txns = await db.transactions.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(10000)
    return {"transactions": txns}


# ==================== TRANSACTIONS ====================

async def _get_txn_count(user_id: str) -> int:
    return await db.transactions.count_documents({"user_id": user_id})


@api_router.get("/transactions", response_model=List[Transaction])
async def list_transactions(
    request: Request,
    status: Optional[str] = None,
    category: Optional[str] = None,
    user: dict = Depends(current_user),
):
    q = {"user_id": user["user_id"]}
    if status and status != "All":
        q["status"] = status
    if category and category != "All":
        q["category"] = category
    docs = await db.transactions.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)
    # Recompute overdue dynamically (in case days passed)
    today = datetime.now(timezone.utc).date()
    for d in docs:
        if d["status"] != "Paid":
            try:
                due = date.fromisoformat(d["due_date"])
                if due < today and d["status"] != "Overdue":
                    await db.transactions.update_one({"id": d["id"]}, {"$set": {"status": "Overdue"}})
                    d["status"] = "Overdue"
            except Exception:
                pass
    return [Transaction(**d) for d in docs]


@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(body: TransactionIn, user: dict = Depends(current_user)):
    count = await _get_txn_count(user["user_id"])
    color = AVATAR_PALETTE[count % len(AVATAR_PALETTE)]
    txn = {
        "id": f"txn_{uuid.uuid4().hex[:12]}",
        "user_id": user["user_id"],
        "borrower_name": body.borrower_name,
        "borrower_phone": body.borrower_phone,
        "borrower_email": body.borrower_email,
        "amount": float(body.amount),
        "due_date": body.due_date,
        "category": body.category,
        "status": compute_status(body.due_date),
        "nudge_count": 0,
        "last_nudged_at": None,
        "last_nudge_channel": None,
        "avatar_color": color,
        "initials": initials_of(body.borrower_name),
        "notes": body.notes,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.transactions.insert_one(txn.copy())
    return Transaction(**txn)


@api_router.put("/transactions/{txn_id}", response_model=Transaction)
async def update_transaction(txn_id: str, body: TransactionUpdate, user: dict = Depends(current_user)):
    txn = await db.transactions.find_one({"id": txn_id, "user_id": user["user_id"]}, {"_id": 0})
    if not txn:
        raise HTTPException(status_code=404, detail="Not found")
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if "borrower_name" in update:
        update["initials"] = initials_of(update["borrower_name"])
    if "due_date" in update or "status" in update:
        new_due = update.get("due_date", txn["due_date"])
        new_status = update.get("status", txn["status"])
        update["status"] = compute_status(new_due, new_status)
    await db.transactions.update_one({"id": txn_id}, {"$set": update})
    txn = await db.transactions.find_one({"id": txn_id}, {"_id": 0})
    return Transaction(**txn)


@api_router.delete("/transactions/{txn_id}")
async def delete_transaction(txn_id: str, user: dict = Depends(current_user)):
    res = await db.transactions.delete_one({"id": txn_id, "user_id": user["user_id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}


@api_router.get("/transactions/{txn_id}/qr")
async def transaction_qr(txn_id: str, user: dict = Depends(current_user)):
    if not user.get("upi_id"):
        raise HTTPException(status_code=400, detail="Set your UPI ID in profile first")
    txn = await db.transactions.find_one({"id": txn_id, "user_id": user["user_id"]}, {"_id": 0})
    if not txn:
        raise HTTPException(status_code=404, detail="Not found")
    link = upi_link(user["upi_id"], user.get("name", "Lender"), txn["amount"])
    return {"upi_link": link, "qr_base64": make_qr_b64(link), "amount": txn["amount"], "borrower_name": txn["borrower_name"]}


# ==================== NUDGES ====================

def days_overdue(due_date: str) -> int:
    try:
        d = date.fromisoformat(due_date)
    except Exception:
        return 0
    delta = (datetime.now(timezone.utc).date() - d).days
    return max(0, delta)


def build_whatsapp_message(level: int, name: str, amount: float, due_date: str,
                            days_od: int, lender_name: str, upi: str) -> str:
    amt = f"₹{amount:,.0f}"
    if level <= 0:
        return (f"Hey {name} 👋\nHope you're doing well! Just a small reminder — you have a pending "
                f"amount of {amt} that was due on {due_date}.\nNo rush at all, just a heads-up! "
                f"Pay here whenever you can:\n💰 {upi} (GPay / PhonePe / Paytm)\n— {lender_name}")
    if level == 1:
        return (f"Hi {name},\nThis is a reminder that {amt} has been pending for {days_od} days "
                f"(due: {due_date}).\nCould you please settle this soon? Even partial works.\n"
                f"💰 Pay: {upi}\nThanks, {lender_name}")
    if level == 2:
        return (f"{name}, this is your 3rd reminder.\n{amt} has been overdue for {days_od} days. "
                f"Please settle this ASAP — delay affects your peer trust score on Nexus 001.\n"
                f"💰 Pay now: {upi}\n— {lender_name} via Nexus 001")
    return (f"⚠️ FINAL NOTICE — {name}\n{amt} has been unpaid for {days_od} days. "
            f"This is your last reminder before your account is flagged as High Risk.\n"
            f"💰 Pay immediately: {upi}\n— {lender_name}")


def build_email_subject(level: int, amount: float, days_od: int, lender_name: str) -> str:
    amt = f"₹{amount:,.0f}"
    if level <= 0:
        return f"Friendly reminder about {amt} — {lender_name}"
    if level == 1:
        return f"Payment reminder: {amt} pending for {days_od} days"
    if level == 2:
        return f"Urgent: {amt} overdue — peer trust score affected"
    return f"⚠️ FINAL NOTICE: {amt} unpaid — High Risk flag incoming"


def build_email_html(level: int, name: str, amount: float, days_od: int,
                     lender_name: str, upi: str, message_text: str) -> str:
    accent = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444"][min(level, 3)]
    pay_url = upi_link(upi, lender_name, amount)
    safe_msg = message_text.replace("\n", "<br>")
    return f"""<!doctype html>
<html><body style="margin:0;background:#0a0a0a;font-family:Inter,Arial,sans-serif;color:#e5e5e5;padding:40px 16px;">
<table align="center" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background:#111111;border:1px solid #222;border-radius:16px;overflow:hidden;">
<tr><td style="padding:28px 28px 12px;border-bottom:1px solid #1a1a1a;">
  <div style="font-size:12px;letter-spacing:0.2em;color:#888;text-transform:uppercase;">Nexus 001 · Reminder</div>
  <div style="font-size:24px;font-weight:700;color:#ffffff;margin-top:6px;">Hi {name},</div>
</td></tr>
<tr><td style="padding:24px 28px;">
  <div style="display:inline-block;padding:6px 12px;border-radius:999px;background:{accent}22;color:{accent};font-size:12px;font-weight:600;letter-spacing:0.05em;">
    LEVEL {level} · {days_od} days overdue
  </div>
  <div style="font-size:36px;font-weight:800;color:{accent};margin-top:18px;">₹{amount:,.0f}</div>
  <div style="color:#bdbdbd;line-height:1.7;margin-top:14px;font-size:15px;">{safe_msg}</div>
</td></tr>
<tr><td style="padding:0 28px 28px;">
  <a href="{pay_url}" style="display:inline-block;background:{accent};color:#0a0a0a;font-weight:700;padding:14px 22px;border-radius:10px;text-decoration:none;font-size:15px;">Pay ₹{amount:,.0f} now →</a>
  <div style="color:#666;font-size:12px;margin-top:14px;">UPI: <span style="color:#aaa;">{upi}</span></div>
</td></tr>
<tr><td style="padding:14px 28px;border-top:1px solid #1a1a1a;color:#555;font-size:11px;">
  Sent via Nexus 001 by {lender_name}. Reply directly to this email to settle privately.
</td></tr>
</table></body></html>"""


async def _record_nudge(user, txn, channel: str, level: int, message_text: str, status: str):
    await db.nudge_logs.insert_one({
        "id": f"log_{uuid.uuid4().hex[:12]}",
        "user_id": user["user_id"],
        "transaction_id": txn["id"],
        "borrower_name": txn["borrower_name"],
        "channel": channel,
        "level": level,
        "message_text": message_text,
        "status": status,
        "sent_at": datetime.now(timezone.utc).isoformat(),
    })
    if status == "sent":
        await db.transactions.update_one(
            {"id": txn["id"]},
            {"$set": {
                "last_nudged_at": datetime.now(timezone.utc).isoformat(),
                "last_nudge_channel": channel,
            }, "$inc": {"nudge_count": 1}},
        )


@api_router.get("/nudge/preview/{txn_id}")
async def nudge_preview(txn_id: str, user: dict = Depends(current_user)):
    txn = await db.transactions.find_one({"id": txn_id, "user_id": user["user_id"]}, {"_id": 0})
    if not txn:
        raise HTTPException(status_code=404, detail="Not found")
    level = min(int(txn.get("nudge_count", 0)), 3)
    od = days_overdue(txn["due_date"])
    upi = user.get("upi_id", "your-upi@bank")
    lender = user.get("name", "Lender")
    wa = build_whatsapp_message(level, txn["borrower_name"], txn["amount"], txn["due_date"], od, lender, upi)
    email_subject = build_email_subject(level, txn["amount"], od, lender)
    email_text = wa  # plain-text fallback similar to wa
    return {
        "level": level,
        "days_overdue": od,
        "whatsapp_message": wa,
        "email_subject": email_subject,
        "email_message": email_text,
    }


@api_router.post("/nudge/whatsapp/{txn_id}")
async def nudge_whatsapp(txn_id: str, body: NudgeSendIn, user: dict = Depends(current_user)):
    txn = await db.transactions.find_one({"id": txn_id, "user_id": user["user_id"]}, {"_id": 0})
    if not txn:
        raise HTTPException(status_code=404, detail="Not found")
    level = min(int(txn.get("nudge_count", 0)), 3)
    from urllib.parse import quote
    phone = "".join(c for c in (txn.get("borrower_phone") or "") if c.isdigit())
    if len(phone) == 10:
        phone = "91" + phone
    wa_link = f"https://wa.me/{phone}?text={quote(body.message)}"
    await _record_nudge(user, txn, "whatsapp", level, body.message, "sent")
    return {"ok": True, "wa_link": wa_link, "level": level}


@api_router.post("/nudge/email/{txn_id}")
async def nudge_email(txn_id: str, body: NudgeSendIn, user: dict = Depends(current_user)):
    txn = await db.transactions.find_one({"id": txn_id, "user_id": user["user_id"]}, {"_id": 0})
    if not txn:
        raise HTTPException(status_code=404, detail="Not found")
    if not txn.get("borrower_email"):
        raise HTTPException(status_code=400, detail="Borrower has no email on file")
    if not user.get("gmail_address") or not user.get("gmail_app_password_enc"):
        raise HTTPException(status_code=400, detail="Configure Gmail in Settings → Email first")
    level = min(int(txn.get("nudge_count", 0)), 3)
    od = days_overdue(txn["due_date"])
    lender = user.get("name", "Lender")
    upi = user.get("upi_id", "your-upi@bank")
    subject = build_email_subject(level, txn["amount"], od, lender)
    html = build_email_html(level, txn["borrower_name"], txn["amount"], od, lender, upi, body.message)

    msg = EmailMessage()
    msg["From"] = f"{lender} <{user['gmail_address']}>"
    msg["To"] = txn["borrower_email"]
    msg["Subject"] = subject
    msg.set_content(body.message)
    msg.add_alternative(html, subtype="html")

    try:
        pw = decrypt_str(user["gmail_app_password_enc"])
        await aiosmtplib.send(msg, hostname="smtp.gmail.com", port=465,
                              username=user["gmail_address"], password=pw,
                              use_tls=True, timeout=20)
        await _record_nudge(user, txn, "email", level, body.message, "sent")
        return {"ok": True, "level": level}
    except Exception as e:
        await _record_nudge(user, txn, "email", level, body.message, "failed")
        raise HTTPException(status_code=400, detail=f"Email send failed: {e}")


@api_router.get("/nudge/log")
async def nudge_log(user: dict = Depends(current_user)):
    logs = await db.nudge_logs.find({"user_id": user["user_id"]}, {"_id": 0}).sort("sent_at", -1).to_list(500)
    return logs


# ==================== INSIGHTS ====================

def _trust_score(transactions: List[dict]) -> int:
    score = 100
    today = datetime.now(timezone.utc).date()
    for t in transactions:
        if t["status"] == "Paid":
            score += 20
        else:
            try:
                due = date.fromisoformat(t["due_date"])
                od = max(0, (today - due).days)
                score -= 10 * od
            except Exception:
                pass
    return max(0, min(100, score))


@api_router.get("/insights/summary")
async def insights_summary(user: dict = Depends(current_user)):
    docs = await db.transactions.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(10000)
    today = datetime.now(timezone.utc).date()

    total_lent = sum(t["amount"] for t in docs)
    total_recovered = sum(t["amount"] for t in docs if t["status"] == "Paid")
    pending = sum(t["amount"] for t in docs if t["status"] == "Pending")
    overdue = sum(t["amount"] for t in docs if t["status"] == "Overdue")
    recovery_rate = (total_recovered / total_lent * 100.0) if total_lent > 0 else 0.0

    by_cat = {}
    for t in docs:
        by_cat[t["category"]] = by_cat.get(t["category"], 0) + t["amount"]
    category_split = [{"name": k, "value": v} for k, v in by_cat.items()]

    # last 6 months trend (proper month arithmetic)
    months = []
    now = datetime.now(timezone.utc).replace(day=1)
    y, m = now.year, now.month
    bucket = []
    for _ in range(6):
        bucket.append((y, m))
        m -= 1
        if m == 0:
            m = 12; y -= 1
    bucket.reverse()
    for yy, mm in bucket:
        dt = datetime(yy, mm, 1)
        months.append((dt.strftime("%b"), dt.strftime("%Y-%m")))
    trend = []
    for label, ym in months:
        lent = 0.0
        recovered = 0.0
        for t in docs:
            try:
                cd = datetime.fromisoformat(t["created_at"]).strftime("%Y-%m")
            except Exception:
                cd = ""
            if cd == ym:
                lent += t["amount"]
                if t["status"] == "Paid":
                    recovered += t["amount"]
        trend.append({"month": label, "lent": lent, "recovered": recovered})

    # top borrowers
    by_b = {}
    for t in docs:
        key = (t["borrower_name"], t.get("borrower_phone", ""))
        b = by_b.setdefault(key, {"name": t["borrower_name"], "phone": t.get("borrower_phone", ""),
                                  "owed": 0.0, "txns": [], "avatar_color": t.get("avatar_color"),
                                  "initials": t.get("initials")})
        if t["status"] != "Paid":
            b["owed"] += t["amount"]
        b["txns"].append(t)
    borrowers = []
    for b in by_b.values():
        b["trust_score"] = _trust_score(b["txns"])
        b.pop("txns", None)
        borrowers.append(b)
    borrowers.sort(key=lambda x: x["owed"], reverse=True)

    return {
        "total_lent": total_lent,
        "total_recovered": total_recovered,
        "pending": pending,
        "overdue": overdue,
        "recovery_rate": round(recovery_rate, 1),
        "category_split": category_split,
        "monthly_trend": trend,
        "top_borrowers": borrowers[:10],
    }


# ==================== WHATSAPP (deep-link mode) ====================

@api_router.get("/whatsapp/status")
async def whatsapp_status(user: dict = Depends(current_user)):
    # Deep-link mode: always "ready" since we use wa.me links from user's own device
    return {"mode": "deeplink", "active": True}


# ==================== MOUNT ====================

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
