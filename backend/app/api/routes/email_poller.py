"""
SharpTel Email Poller
─────────────────────
GET/POST /api/v1/poll-emails
- cPanel IMAP se naye emails fetch karta hai (imap-tools use karke)
- AI (Claude/GPT-4o) se inquiry details parse karta hai
- Neon DB mein service_inquiries insert karta hai
- Next.js notifications table mein alert insert karta hai
- Optional: Slack / WhatsApp notify

Cron setup: cron-job.org se har 5 minute mein hit karein:
  GET https://your-api-domain.com/api/v1/poll-emails?secret=YOUR_POLL_SECRET
"""

import json
import logging
import smtplib
import uuid
from datetime import datetime, timedelta, timezone
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Any

import httpx
import psycopg2
from bs4 import BeautifulSoup
from fastapi import APIRouter, HTTPException, Query
from imap_tools import MailBox, AND, MailMessageFlags

from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Email Poller"])

# ─── AI Parsing Prompt ────────────────────────────────────────────────────────

PARSE_PROMPT = """You are expert parser for SharpTel.pk IT services inquiries (Pakistan-based: internet connectivity, WiFi solutions, cyber security, managed IT, etc.). Emails may be in Urdu/English mix.

Subject: {subject}
From: {from_addr}
Body: {body_text}

Extract ONLY valid JSON, nothing else:

{{
  "is_new_inquiry": true/false,
  "inquiry_type": "internet_connectivity" | "wifi_solution" | "cyber_security" | "managed_it" | "voip" | "cctv" | "networking" | "other",
  "customer_name": "string or null",
  "phone": "string or null (Pakistani format: 0300-1234567 or +923001234567)",
  "email": "string or null",
  "location": "string (e.g. Clifton Karachi, DHA Lahore, F-7 Islamabad)",
  "service_details": "string describing what they need",
  "budget": "string or null (e.g. 50,000 PKR, 500 USD)",
  "notes": "any special instructions or extra info",
  "is_query": true/false,
  "query_type": "follow_up" | "complaint" | "status_check" | "cancellation" | "none",
  "urgency": "high" | "normal" | "low",
  "language": "urdu" | "english" | "mixed"
}}

Rules:
- is_new_inquiry = true if someone wants SharpTel services
- is_query = true if they are asking about existing service/complaint
- Be accurate with Pakistani addresses (Karachi areas: DHA, Clifton, Gulshan, PECHS, Saddar, North Nazimabad; Lahore: DHA, Gulberg, Johar Town; Islamabad: F sectors, G sectors, Blue Area)
- If field is unclear → use null
- Extract phone in format mentioned in email (don't normalize)
- Return ONLY the JSON object, no markdown, no explanation"""

# ─── Helpers ──────────────────────────────────────────────────────────────────

def _get_db_conn():
    """Sync psycopg2 connection to Neon DB."""
    return psycopg2.connect(settings.DATABASE_SYNC_URL)


def _strip_html(html: str) -> str:
    """Convert HTML email body to plain text."""
    try:
        soup = BeautifulSoup(html, "lxml")
        for tag in soup(["script", "style", "head"]):
            tag.decompose()
        return soup.get_text(separator="\n", strip=True)[:4000]
    except Exception:
        return html[:4000]


def _get_body(msg) -> str:
    """Extract best available text body from email message."""
    text = msg.text or ""
    html = msg.html or ""
    if text:
        return text[:4000]
    if html:
        return _strip_html(html)
    return "(no body)"


def _cuid_like() -> str:
    """Generate a cuid-compatible string ID for Prisma tables."""
    return "c" + uuid.uuid4().hex[:23]


# ─── AI Parsing ───────────────────────────────────────────────────────────────

async def _parse_with_ai(subject: str, from_addr: str, body: str) -> dict[str, Any]:
    """Call Claude or OpenAI to parse inquiry. Returns parsed dict."""
    prompt = PARSE_PROMPT.format(
        subject=subject[:200],
        from_addr=from_addr[:100],
        body_text=body[:3000],
    )

    try:
        if settings.AI_PROVIDER == "anthropic" and settings.ANTHROPIC_KEY:
            import anthropic
            client = anthropic.Anthropic(api_key=settings.ANTHROPIC_KEY)
            resp = client.messages.create(
                model=settings.AI_MODEL,
                max_tokens=settings.AI_MAX_TOKENS,
                messages=[{"role": "user", "content": prompt}],
            )
            raw = resp.content[0].text.strip()

        elif settings.AI_PROVIDER == "openai" and settings.OPENAI_KEY:
            from openai import OpenAI
            client = OpenAI(api_key=settings.OPENAI_KEY)
            resp = client.chat.completions.create(
                model="gpt-4o",
                max_tokens=settings.AI_MAX_TOKENS,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
            )
            raw = resp.choices[0].message.content or "{}"

        else:
            # Fallback: simple heuristic parsing (no AI key configured)
            logger.warning("No AI key configured — using heuristic fallback")
            return _heuristic_parse(subject, from_addr, body)

        # Strip markdown code block if AI wrapped JSON
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]

        parsed = json.loads(raw.strip())
        return parsed

    except json.JSONDecodeError as e:
        logger.error(f"AI returned invalid JSON: {e}")
        return _heuristic_parse(subject, from_addr, body)
    except Exception as e:
        logger.error(f"AI parsing failed: {e}")
        return _heuristic_parse(subject, from_addr, body)


def _heuristic_parse(subject: str, from_addr: str, body: str) -> dict[str, Any]:
    """Simple keyword-based fallback when no AI key is available."""
    subj_lower = (subject + " " + body[:500]).lower()
    inquiry_type = "other"
    if any(w in subj_lower for w in ["internet", "broadband", "isp", "fiber", "bandwidth"]):
        inquiry_type = "internet_connectivity"
    elif any(w in subj_lower for w in ["wifi", "wi-fi", "wireless", "access point"]):
        inquiry_type = "wifi_solution"
    elif any(w in subj_lower for w in ["cyber", "security", "firewall", "vpn", "pentest"]):
        inquiry_type = "cyber_security"
    elif any(w in subj_lower for w in ["cctv", "camera", "surveillance"]):
        inquiry_type = "cctv"
    elif any(w in subj_lower for w in ["voip", "pbx", "phone system", "ip phone"]):
        inquiry_type = "voip"

    is_query = any(w in subj_lower for w in ["status", "complaint", "follow", "cancel", "where is", "kahan"])

    return {
        "is_new_inquiry": not is_query,
        "inquiry_type": inquiry_type,
        "customer_name": None,
        "phone": None,
        "email": from_addr,
        "location": None,
        "service_details": subject,
        "budget": None,
        "notes": "Auto-parsed (no AI key — configure ANTHROPIC_KEY)",
        "is_query": is_query,
        "query_type": "status_check" if is_query else "none",
        "urgency": "normal",
        "language": "english",
    }


# ─── Duplicate Check ──────────────────────────────────────────────────────────

def _is_duplicate(conn, phone: str | None, email_uid: str) -> bool:
    """Return True if same phone seen in last 24h or email_uid already processed."""
    with conn.cursor() as cur:
        # Check by IMAP UID (exact duplicate)
        cur.execute(
            "SELECT 1 FROM service_inquiries WHERE email_uid = %s LIMIT 1",
            (email_uid,),
        )
        if cur.fetchone():
            return True
        # Check by phone in last 24h (prevent re-submission spam)
        if phone:
            cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
            cur.execute(
                "SELECT 1 FROM service_inquiries WHERE phone = %s AND created_at > %s LIMIT 1",
                (phone, cutoff),
            )
            if cur.fetchone():
                return True
    return False


# ─── DB Inserts ───────────────────────────────────────────────────────────────

def _insert_inquiry(conn, parsed: dict, raw_subject: str, raw_from: str, raw_body: str, uid: str) -> str:
    """Insert into service_inquiries. Returns new inquiry ID."""
    inquiry_id = str(uuid.uuid4())
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO service_inquiries
              (id, inquiry_type, customer_name, phone, email, location, service_details,
               budget, notes, is_query, query_type, status, raw_subject, raw_from,
               raw_body, email_uid, ai_parsed, created_at, updated_at)
            VALUES
              (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """,
            (
                inquiry_id,
                parsed.get("inquiry_type", "other"),
                parsed.get("customer_name"),
                parsed.get("phone"),
                parsed.get("email"),
                parsed.get("location"),
                str(parsed.get("service_details", "")) if parsed.get("service_details") else None,
                parsed.get("budget"),
                parsed.get("notes"),
                bool(parsed.get("is_query", False)),
                parsed.get("query_type", "none"),
                "new",
                raw_subject[:998] if raw_subject else None,
                raw_from[:300] if raw_from else None,
                raw_body[:8000] if raw_body else None,
                uid,
                json.dumps(parsed),
                datetime.now(timezone.utc),
                datetime.now(timezone.utc),
            ),
        )
    conn.commit()
    return inquiry_id


def _insert_notifications(conn, inquiry_id: str, parsed: dict, raw_from: str):
    """Create in-app notifications for all ADMIN users in Next.js notifications table."""
    is_query    = bool(parsed.get("is_query", False))
    name        = parsed.get("customer_name") or raw_from.split("<")[0].strip() or "Someone"
    inq_type    = parsed.get("inquiry_type", "inquiry").replace("_", " ").title()
    urgency     = parsed.get("urgency", "normal")
    notif_type  = "SYSTEM"   # Using SYSTEM type from our NotificationType enum

    if is_query:
        title   = f"New Query Received"
        message = f"{name} sent a {parsed.get('query_type','query').replace('_',' ')} query."
    else:
        title   = f"New {inq_type} Inquiry"
        message = f"{name} is asking about {inq_type} services. Urgency: {urgency.upper()}."
        if parsed.get("location"):
            message += f" Location: {parsed['location']}."

    with conn.cursor() as cur:
        # Get all ADMIN users
        cur.execute("SELECT id FROM users WHERE role = 'ADMIN'")
        admins = cur.fetchall()
        for (user_id,) in admins:
            notif_id = _cuid_like()
            cur.execute(
                """
                INSERT INTO notifications
                  (id, "userId", title, message, type, "entityType", "entityId", "isRead", "createdAt")
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT DO NOTHING
                """,
                (
                    notif_id, user_id, title, message, notif_type,
                    "service_inquiry", inquiry_id, False,
                    datetime.now(timezone.utc),
                ),
            )
    conn.commit()


def _update_poll_state(conn, key: str, last_uid: str):
    """Upsert the poll state timestamp."""
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO email_poll_state (key, last_uid, last_checked)
            VALUES (%s, %s, %s)
            ON CONFLICT (key) DO UPDATE
              SET last_uid = EXCLUDED.last_uid,
                  last_checked = EXCLUDED.last_checked
            """,
            (key, last_uid, datetime.now(timezone.utc)),
        )
    conn.commit()


def _get_last_uid(conn, key: str) -> str | None:
    with conn.cursor() as cur:
        cur.execute("SELECT last_uid FROM email_poll_state WHERE key = %s", (key,))
        row = cur.fetchone()
    return row[0] if row else None


# ─── External Notifications ───────────────────────────────────────────────────

async def _notify_slack(parsed: dict, raw_from: str):
    if not settings.SLACK_WEBHOOK_URL:
        return
    name  = parsed.get("customer_name") or raw_from
    itype = parsed.get("inquiry_type", "inquiry").replace("_", " ").title()
    loc   = parsed.get("location", "—")
    phone = parsed.get("phone", "—")
    emoji = "🚨" if parsed.get("urgency") == "high" else "📧"

    text = (
        f"{emoji} *New SharpTel Inquiry*\n"
        f"*Type:* {itype}\n"
        f"*From:* {name}\n"
        f"*Phone:* {phone}\n"
        f"*Location:* {loc}\n"
        f"*Details:* {str(parsed.get('service_details',''))[:200]}"
    )
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(settings.SLACK_WEBHOOK_URL, json={"text": text})
    except Exception as e:
        logger.warning(f"Slack notify failed: {e}")


async def _notify_whatsapp(parsed: dict, raw_from: str):
    if not all([settings.TWILIO_SID, settings.TWILIO_TOKEN, settings.TWILIO_TO_WA]):
        return
    name  = parsed.get("customer_name") or raw_from
    itype = parsed.get("inquiry_type", "inquiry").replace("_", " ")
    msg   = (
        f"🔔 New SharpTel Inquiry\n"
        f"Type: {itype}\n"
        f"From: {name}\n"
        f"Phone: {parsed.get('phone','—')}\n"
        f"Location: {parsed.get('location','—')}\n"
        f"Details: {str(parsed.get('service_details',''))[:150]}"
    )
    try:
        from twilio.rest import Client
        client = Client(settings.TWILIO_SID, settings.TWILIO_TOKEN)
        client.messages.create(
            body=msg,
            from_=settings.TWILIO_FROM_WA,
            to=settings.TWILIO_TO_WA,
        )
    except Exception as e:
        logger.warning(f"WhatsApp notify failed: {e}")


def _send_alert_email(parsed: dict, raw_from: str, raw_subject: str):
    """Send email alert to admin team via SMTP."""
    if not settings.ALERT_EMAILS or not settings.SMTP_PASS:
        return
    recipients = [e.strip() for e in settings.ALERT_EMAILS.split(",") if e.strip()]
    if not recipients:
        return

    name  = parsed.get("customer_name") or raw_from
    itype = parsed.get("inquiry_type", "inquiry").replace("_", " ").title()

    html = f"""
    <h2>New SharpTel Inquiry</h2>
    <table border="1" cellpadding="6" style="border-collapse:collapse">
      <tr><th>Type</th><td>{itype}</td></tr>
      <tr><th>Customer</th><td>{name}</td></tr>
      <tr><th>Phone</th><td>{parsed.get('phone','—')}</td></tr>
      <tr><th>Email</th><td>{parsed.get('email','—')}</td></tr>
      <tr><th>Location</th><td>{parsed.get('location','—')}</td></tr>
      <tr><th>Budget</th><td>{parsed.get('budget','—')}</td></tr>
      <tr><th>Details</th><td>{parsed.get('service_details','—')}</td></tr>
      <tr><th>Notes</th><td>{parsed.get('notes','—')}</td></tr>
      <tr><th>Urgency</th><td>{parsed.get('urgency','normal').upper()}</td></tr>
      <tr><th>Original Subject</th><td>{raw_subject}</td></tr>
    </table>
    <p>Check your LSM dashboard for full details.</p>
    """

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"[SharpTel LSM] New {itype} Inquiry"
        msg["From"]    = settings.SMTP_FROM
        msg["To"]      = ", ".join(recipients)
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as srv:
            srv.starttls()
            srv.login(settings.SMTP_USER, settings.SMTP_PASS)
            srv.sendmail(settings.SMTP_USER, recipients, msg.as_string())
    except Exception as e:
        logger.warning(f"Alert email failed: {e}")


# ─── Main Endpoint ────────────────────────────────────────────────────────────

@router.get("/poll-emails")
@router.post("/poll-emails")
async def poll_emails(
    secret: str = Query(default="", description="Poll secret from .env POLL_SECRET"),
    limit:  int = Query(default=20, le=50, description="Max emails per run"),
):
    """
    Email poller endpoint.
    cPanel inbox → AI parse → Neon DB → in-app notifications.
    Hit every 5 min via cron-job.org
    """
    # ── 1. Auth check ──────────────────────────────────────────────────────
    if settings.POLL_SECRET and secret != settings.POLL_SECRET:
        raise HTTPException(status_code=401, detail="Invalid poll secret")

    if not settings.IMAP_PASS:
        raise HTTPException(status_code=503, detail="IMAP_PASS not configured in .env")

    results = {
        "polled_at": datetime.now(timezone.utc).isoformat(),
        "emails_checked": 0,
        "inquiries_created": 0,
        "duplicates_skipped": 0,
        "errors": [],
    }

    conn = None
    try:
        conn = _get_db_conn()
        last_uid = _get_last_uid(conn, settings.IMAP_USER)

        # ── 2. Connect to IMAP ─────────────────────────────────────────────
        with MailBox(settings.IMAP_HOST, settings.IMAP_PORT).login(
            settings.IMAP_USER, settings.IMAP_PASS
        ) as mb:
            mb.folder.set(settings.IMAP_FOLDER)

            # Fetch unread emails (unseen). imap-tools handles SSL automatically on port 993.
            emails = list(mb.fetch(
                AND(seen=False),
                limit=limit,
                mark_seen=False,   # we mark seen after processing
                bulk=True,
            ))

            results["emails_checked"] = len(emails)
            last_processed_uid = last_uid

            for msg in emails:
                uid_str = str(msg.uid)
                try:
                    subject  = msg.subject or "(no subject)"
                    from_str = str(msg.from_) or ""
                    body     = _get_body(msg)

                    # ── 3. Duplicate check ─────────────────────────────────
                    # We parse first to get phone, then check
                    parsed = await _parse_with_ai(subject, from_str, body)

                    if _is_duplicate(conn, parsed.get("phone"), uid_str):
                        results["duplicates_skipped"] += 1
                        # Still mark as read so we don't re-process
                        if settings.IMAP_MARK_READ:
                            mb.flag([msg.uid], [MailMessageFlags.SEEN], True)
                        continue

                    # ── 4. Insert inquiry ──────────────────────────────────
                    inquiry_id = _insert_inquiry(conn, parsed, subject, from_str, body, uid_str)

                    # ── 5. In-app notifications ────────────────────────────
                    _insert_notifications(conn, inquiry_id, parsed, from_str)

                    # ── 6. External notifications ──────────────────────────
                    if parsed.get("is_new_inquiry") or parsed.get("urgency") == "high":
                        await _notify_slack(parsed, from_str)
                        await _notify_whatsapp(parsed, from_str)
                        _send_alert_email(parsed, from_str, subject)

                    # ── 7. Mark as read + optional move ───────────────────
                    if settings.IMAP_MARK_READ:
                        mb.flag([msg.uid], [MailMessageFlags.SEEN], True)

                    if settings.IMAP_MOVE_FOLDER:
                        try:
                            mb.move([msg.uid], settings.IMAP_MOVE_FOLDER)
                        except Exception:
                            pass  # Folder may not exist — ignore

                    last_processed_uid = uid_str
                    results["inquiries_created"] += 1
                    logger.info(f"Inquiry created: {inquiry_id} from {from_str}")

                except Exception as e:
                    err_msg = f"Error processing email uid={uid_str}: {e}"
                    logger.error(err_msg)
                    results["errors"].append(err_msg)
                    continue

        # ── 8. Update poll state ───────────────────────────────────────────
        if last_processed_uid:
            _update_poll_state(conn, settings.IMAP_USER, str(last_processed_uid))

    except Exception as e:
        logger.error(f"Poll failed: {e}")
        raise HTTPException(status_code=500, detail=f"Poll failed: {str(e)}")
    finally:
        if conn:
            conn.close()

    return results


# ─── Inquiries List Endpoint ──────────────────────────────────────────────────

@router.get("/inquiries")
async def list_inquiries(
    status:       str | None = Query(default=None),
    inquiry_type: str | None = Query(default=None),
    limit:        int        = Query(default=50, le=200),
    offset:       int        = Query(default=0),
):
    """List parsed inquiries from service_inquiries table."""
    conn = None
    try:
        conn = _get_db_conn()
        with conn.cursor() as cur:
            where_clauses = []
            params: list = []
            if status:
                where_clauses.append("status = %s")
                params.append(status)
            if inquiry_type:
                where_clauses.append("inquiry_type = %s")
                params.append(inquiry_type)

            where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""
            cur.execute(
                f"""
                SELECT id, inquiry_type, customer_name, phone, email, location,
                       service_details, budget, is_query, query_type, urgency,
                       status, raw_subject, raw_from, created_at
                FROM service_inquiries
                {where_sql}
                ORDER BY created_at DESC
                LIMIT %s OFFSET %s
                """,
                [*params, limit, offset],
            )
            cols = [d[0] for d in cur.description]
            rows = [dict(zip(cols, r)) for r in cur.fetchall()]
            # Serialize datetime
            for row in rows:
                if row.get("created_at"):
                    row["created_at"] = row["created_at"].isoformat()

            cur.execute(f"SELECT COUNT(*) FROM service_inquiries {where_sql}", params)
            total = cur.fetchone()[0]

        return {"total": total, "inquiries": rows}
    finally:
        if conn:
            conn.close()


@router.patch("/inquiries/{inquiry_id}/status")
async def update_inquiry_status(inquiry_id: str, status: str):
    """Update inquiry status: new / in_progress / resolved / spam"""
    valid = {"new", "in_progress", "resolved", "spam"}
    if status not in valid:
        raise HTTPException(status_code=400, detail=f"Status must be one of: {valid}")
    conn = None
    try:
        conn = _get_db_conn()
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE service_inquiries SET status=%s, updated_at=%s WHERE id=%s",
                (status, datetime.now(timezone.utc), inquiry_id),
            )
        conn.commit()
        return {"ok": True, "id": inquiry_id, "status": status}
    finally:
        if conn:
            conn.close()
