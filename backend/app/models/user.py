import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Role(str, enum.Enum):
    ADMIN = "ADMIN"
    WAREHOUSE_MANAGER = "WAREHOUSE_MANAGER"
    SALES_MANAGER = "SALES_MANAGER"
    LOGISTICS_OFFICER = "LOGISTICS_OFFICER"
    VIEWER = "VIEWER"


class User(Base):
    __tablename__ = "users"

    id:         Mapped[str]      = mapped_column(String, primary_key=True)
    name:       Mapped[str]      = mapped_column(String, nullable=False)
    email:      Mapped[str]      = mapped_column(String, unique=True, nullable=False, index=True)
    password:   Mapped[str]      = mapped_column(String, nullable=False)
    role:       Mapped[Role]     = mapped_column(Enum(Role), default=Role.VIEWER, nullable=False)
    is_active:  Mapped[bool]     = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
