from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    APP_NAME: str = "SharpTel LSM API"
    VERSION:  str = "1.0.0"
    DEBUG:    bool = False

    # Database (asyncpg for FastAPI async routes)
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/lsm_db"
    # Sync URL for email poller (psycopg2 — simpler for background tasks)
    DATABASE_SYNC_URL: str = "postgresql://postgres:password@localhost:5432/lsm_db"

    # JWT
    SECRET_KEY:                  str = "change-me-in-production"
    ALGORITHM:                   str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS:   int = 7

    # CORS
    FRONTEND_URL: str = "http://localhost:3000"

    # ── IMAP Email Polling ────────────────────────────────────────────────────
    IMAP_HOST:   str = "mail.sharptel.pk"    # cPanel IMAP host
    IMAP_PORT:   int = 993                   # IMAP SSL port
    IMAP_USER:   str = "info@sharptel.pk"    # Full email address
    IMAP_PASS:   str = ""                    # cPanel email password
    IMAP_FOLDER: str = "INBOX"               # Folder to poll
    IMAP_MARK_READ:  bool = True             # Mark emails as read after processing
    IMAP_MOVE_FOLDER: str = "Processed"      # Move to this folder after processing (empty = don't move)
    # Security: cron secret so only authorized callers can trigger poll
    POLL_SECRET: str = "change-me-poll-secret"

    # ── AI Parsing ────────────────────────────────────────────────────────────
    AI_PROVIDER:    str = "anthropic"        # "anthropic" or "openai"
    ANTHROPIC_KEY:  str = ""                 # Get from console.anthropic.com
    OPENAI_KEY:     str = ""                 # Get from platform.openai.com
    AI_MODEL:       str = "claude-sonnet-4-6"  # or "gpt-4o"
    AI_MAX_TOKENS:  int = 1024

    # ── Notifications ─────────────────────────────────────────────────────────
    # Slack webhook (optional — create at api.slack.com/apps)
    SLACK_WEBHOOK_URL: str = ""
    # WhatsApp via Twilio (optional)
    TWILIO_SID:        str = ""
    TWILIO_TOKEN:      str = ""
    TWILIO_FROM_WA:    str = "whatsapp:+14155238886"  # Twilio sandbox
    TWILIO_TO_WA:      str = ""                        # e.g. whatsapp:+923001234567

    # SMTP (for sending email alerts)
    SMTP_HOST: str = "mail.sharptel.pk"
    SMTP_PORT: int = 587
    SMTP_USER: str = "no-reply@sharptel.pk"
    SMTP_PASS: str = ""
    SMTP_FROM: str = "SharpTel LSM <no-reply@sharptel.pk>"
    ALERT_EMAILS: str = ""   # comma-separated: admin@sharptel.pk,mgr@sharptel.pk


settings = Settings()
