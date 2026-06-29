from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey, Float, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base
import enum


class AccountStatus(str, enum.Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    FLOOD_WAIT = "flood_wait"
    UNAUTHORIZED = "unauthorized"


class JobStatus(str, enum.Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    STOPPED = "stopped"


class LeadStatus(str, enum.Enum):
    NEW = "new"
    CONTACTED = "contacted"
    REPLIED = "replied"
    CLOSED = "closed"


class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    phone_number = Column(String, unique=True, nullable=False)
    name = Column(String)
    username = Column(String)
    api_id = Column(String, nullable=False)
    api_hash = Column(String, nullable=False)
    session_string = Column(Text)
    status = Column(Enum(AccountStatus), default=AccountStatus.OFFLINE)
    last_active = Column(DateTime(timezone=True))
    last_login = Column(DateTime(timezone=True))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    jobs = relationship("ScrapingJob", back_populates="account")


class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, index=True)
    telegram_id = Column(String, unique=True)
    name = Column(String, nullable=False)
    username = Column(String)
    url = Column(String, nullable=False)
    member_count = Column(Integer, default=0)
    description = Column(Text)
    is_public = Column(Boolean, default=True)
    last_scraped = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    jobs = relationship("ScrapingJob", back_populates="group")
    scrape_history = relationship("ScrapeHistory", back_populates="group")


class ScrapingJob(Base):
    __tablename__ = "scraping_jobs"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"))
    group_id = Column(Integer, ForeignKey("groups.id"))
    status = Column(Enum(JobStatus), default=JobStatus.QUEUED)
    progress = Column(Float, default=0.0)
    current_step = Column(String)
    members_processed = Column(Integer, default=0)
    members_saved = Column(Integer, default=0)
    duplicates_found = Column(Integer, default=0)
    error_message = Column(Text)
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    account = relationship("Account", back_populates="jobs")
    group = relationship("Group", back_populates="jobs")


class ScrapeHistory(Base):
    __tablename__ = "scrape_history"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"))
    account_id = Column(Integer, ForeignKey("accounts.id"))
    group_name = Column(String)
    total_members = Column(Integer, default=0)
    imported_members = Column(Integer, default=0)
    duplicates = Column(Integer, default=0)
    duration_seconds = Column(Integer)
    status = Column(String)
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    group = relationship("Group", back_populates="scrape_history")


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    telegram_user_id = Column(String, unique=True, nullable=False)
    name = Column(String)
    username = Column(String)
    phone = Column(String)
    source_group_id = Column(Integer, ForeignKey("groups.id"))
    source_group_name = Column(String)
    assigned_account_id = Column(Integer, ForeignKey("accounts.id"))
    status = Column(Enum(LeadStatus), default=LeadStatus.NEW)
    notes = Column(Text)
    import_date = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    action = Column(String, nullable=False)
    description = Column(Text)
    entity_type = Column(String)
    entity_id = Column(Integer)
    user = Column(String, default="system")
    level = Column(String, default="info")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
