# Nexus 001 — PRD

## Original problem statement
Build a full-stack production web app called **Nexus 001** — a peer lending recovery tracker for hostel/college students in India. Students informally lend money to friends and use this app to track it, send reminders, and get paid back via UPI.

## Architecture
- Frontend: React (CRA + craco) + TailwindCSS + shadcn/ui + Recharts
- Backend: FastAPI (Python) + Motor (async Mongo driver)
- DB: Local MongoDB (`MONGO_URL` / `DB_NAME=test_database`)
- Auth: Emergent-managed Google OAuth (cookie + bearer-token fallback)
- Email: Gmail SMTP via `aiosmtplib` (port 465 SSL); user-supplied app password (Fernet-encrypted at rest)
- WhatsApp: Deep-link mode (`wa.me/<phone>?text=…`) — no session, no Puppeteer
- QR codes: `qrcode[pil]` UPI payment QR (base64 PNG)
- Encryption: Fernet, key in `ENCRYPTION_KEY` env

## User personas
- College student (lender) — tracks informal loans, sends polite reminders, exports data
- Borrower (no app account) — receives WhatsApp/email reminders + UPI link/QR

## Core requirements (static)
- Google sign-in, onboarding (UPI ID required)
- Track transactions: borrower, phone, amount, due date, category, status, notes
- Auto status: Pending → Overdue past due date; manual → Paid
- 4-level escalation (Friendly / Firm / Urgent / Final) per transaction's `nudge_count`
- WhatsApp deep-link send + Email send via user's Gmail
- UPI QR code per transaction + personal QR
- Insights: recovery rate, category split donut, 6-month bar trend, top borrowers w/ trust score
- Settings: profile / WhatsApp info / Email creds / danger zone (export, delete)

## What's been implemented (2026-04-25)
- ✅ Emergent Google OAuth flow with Bearer fallback (CORS-safe, no withCredentials)
- ✅ Onboarding (name, college, branch, UPI ID)
- ✅ Transactions CRUD with auto-overdue, avatar palette, initials
- ✅ UPI QR endpoints (transaction + personal) with download/copy
- ✅ Nudge preview API + 4-level templates (WhatsApp + HTML email)
- ✅ WhatsApp deep-link send (returns `wa.me/...` link, logs nudge, increments count)
- ✅ Email send via aiosmtplib (Gmail SMTP 465 SSL) with HTML pay-now button
- ✅ Insights summary (recovery, category split, 6-month trend with proper month math, top borrowers w/ trust score)
- ✅ Account export (JSON) + cascade delete
- ✅ Frontend: Login (NEXUS 001 wordmark, floating ₹ animation), Onboarding, Dashboard (stat cards), Transactions (filters + actions), Nudge Center (overdue cards + delivery log), Insights (charts), Settings (4 tabs)
- ✅ Sidebar nav, mobile drawer, sonner toasts, shadcn dialogs/popover/calendar
- ✅ Backend test suite (21/21 passing) at `/app/backend/tests/test_nexus_api.py`

## Backlog (P0/P1/P2)
- P1: Replace native phone input with intl-phone-input (auto +91)
- P1: Recurring loans & partial repayments
- P1: Bulk import borrowers from contacts CSV
- P2: WhatsApp Business API integration as upgrade path (instead of deep-link)
- P2: Push notifications for due-date alerts
- P2: Group/split lending (one transaction shared across multiple borrowers)
- P2: Borrower self-serve confirmation page (link in email → "I've paid" button)
- P2: Rate-limit nudge endpoints

## Test credentials
See `/app/memory/test_credentials.md` and `/app/auth_testing.md` for mongosh seed snippet.
