from sqlalchemy import Column, String, DateTime, Text, Boolean, JSON
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime, timezone
from app.core.database import Base


class ServiceInquiry(Base):
    """SharpTel service inquiry parsed from inbound email."""
    __tablename__ = "service_inquiries"

    id             = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    inquiry_type   = Column(String(50),  nullable=False, default="other")
    customer_name  = Column(String(200), nullable=True)
    phone          = Column(String(50),  nullable=True)
    email          = Column(String(200), nullable=True)
    location       = Column(String(500), nullable=True)
    service_details= Column(Text,        nullable=True)
    budget         = Column(String(200), nullable=True)
    notes          = Column(Text,        nullable=True)
    is_query       = Column(Boolean,     default=False)
    query_type     = Column(String(50),  nullable=True)
    status         = Column(String(20),  default="new")   # new / in_progress / resolved / spam
    # Raw email data
    raw_subject    = Column(String(998), nullable=True)
    raw_from       = Column(String(300), nullable=True)
    raw_body       = Column(Text,        nullable=True)
    email_uid      = Column(String(100), nullable=True, unique=True)  # IMAP UID — dedup key
    email_folder   = Column(String(100), nullable=True, default="INBOX")
    ai_parsed      = Column(JSON,        nullable=True)   # full AI JSON response
    created_at     = Column(DateTime,    default=lambda: datetime.now(timezone.utc))
    updated_at     = Column(DateTime,    default=lambda: datetime.now(timezone.utc),
                            onupdate=lambda: datetime.now(timezone.utc))


class EmailPollState(Base):
    """Stores the last poll timestamp so we don't re-process old emails."""
    __tablename__ = "email_poll_state"

    key           = Column(String(100), primary_key=True)   # e.g. "info@sharptel.pk"
    last_uid      = Column(String(100), nullable=True)       # last processed IMAP UID
    last_checked  = Column(DateTime,    nullable=True)
    emails_parsed = Column(String(20),  nullable=True, default="0")  # total counter
