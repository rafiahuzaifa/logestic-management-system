-- ============================================================
-- SharpTel LSM — Email Automation Tables
-- Run this ONCE on your Neon DB (psql or Neon console)
-- ============================================================

-- ── 1. Service Inquiries ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_inquiries (
    id               TEXT        PRIMARY KEY,
    inquiry_type     TEXT        NOT NULL DEFAULT 'other',
    -- Parsed contact info
    customer_name    TEXT,
    phone            TEXT,
    email            TEXT,
    location         TEXT,
    service_details  TEXT,
    budget           TEXT,
    notes            TEXT,
    -- Classification
    is_query         BOOLEAN     NOT NULL DEFAULT FALSE,
    query_type       TEXT,
    urgency          TEXT        NOT NULL DEFAULT 'normal',
    status           TEXT        NOT NULL DEFAULT 'new',   -- new | in_progress | resolved | spam
    -- Raw email data (for audit/fallback)
    raw_subject      TEXT,
    raw_from         TEXT,
    raw_body         TEXT,
    email_uid        TEXT        UNIQUE,    -- IMAP UID — prevents reprocessing same email
    email_folder     TEXT        DEFAULT 'INBOX',
    ai_parsed        JSONB,                -- Full AI response JSON
    -- Timestamps
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_inquiries_status       ON service_inquiries (status);
CREATE INDEX IF NOT EXISTS idx_inquiries_type         ON service_inquiries (inquiry_type);
CREATE INDEX IF NOT EXISTS idx_inquiries_phone        ON service_inquiries (phone);
CREATE INDEX IF NOT EXISTS idx_inquiries_created      ON service_inquiries (created_at DESC);

-- ── 2. Poll State (tracks last processed email) ───────────────
CREATE TABLE IF NOT EXISTS email_poll_state (
    key           TEXT        PRIMARY KEY,  -- e.g. "info@sharptel.pk"
    last_uid      TEXT,                     -- last IMAP UID processed
    last_checked  TIMESTAMPTZ,
    emails_parsed TEXT        DEFAULT '0'
);

-- ── 3. (Optional) pg_notify trigger for real-time SSE ────────
-- When a new inquiry is inserted, notify the 'new_inquiry' channel
-- Next.js SSE endpoint can LISTEN to this channel

CREATE OR REPLACE FUNCTION notify_new_inquiry()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify(
        'new_inquiry',
        json_build_object(
            'id',           NEW.id,
            'type',         NEW.inquiry_type,
            'name',         NEW.customer_name,
            'phone',        NEW.phone,
            'location',     NEW.location,
            'urgency',      NEW.urgency,
            'is_query',     NEW.is_query,
            'created_at',   NEW.created_at
        )::text
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_new_inquiry ON service_inquiries;
CREATE TRIGGER trg_new_inquiry
    AFTER INSERT ON service_inquiries
    FOR EACH ROW EXECUTE FUNCTION notify_new_inquiry();

-- ── 4. Helper view for dashboard ─────────────────────────────
CREATE OR REPLACE VIEW inquiry_summary AS
SELECT
    inquiry_type,
    status,
    COUNT(*)                                        AS total,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') AS last_24h,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')   AS last_7d
FROM service_inquiries
GROUP BY inquiry_type, status
ORDER BY total DESC;

COMMENT ON TABLE service_inquiries  IS 'SharpTel email inquiries parsed by AI';
COMMENT ON TABLE email_poll_state   IS 'Tracks last IMAP poll state per email account';
