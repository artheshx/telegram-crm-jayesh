from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.models import AccountStatus, JobStatus, LeadStatus


# Account Schemas
class AccountCreate(BaseModel):
    phone_number: str
    api_id: str
    api_hash: str


class AccountUpdate(BaseModel):
    status: Optional[AccountStatus] = None


class AccountOTPVerify(BaseModel):
    phone_number: str
    code: str
    phone_code_hash: str
    password: Optional[str] = None


class AccountOut(BaseModel):
    id: int
    phone_number: str
    name: Optional[str]
    username: Optional[str]
    status: AccountStatus
    last_active: Optional[datetime]
    last_login: Optional[datetime]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Group Schemas
class GroupCreate(BaseModel):
    url: str


class GroupOut(BaseModel):
    id: int
    telegram_id: Optional[str]
    name: str
    username: Optional[str]
    url: str
    member_count: int
    last_scraped: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


# Job Schemas
class ScrapingJobCreate(BaseModel):
    account_id: int
    group_url: str


class ScrapingJobOut(BaseModel):
    id: int
    account_id: int
    group_id: Optional[int]
    status: JobStatus
    progress: float
    current_step: Optional[str]
    members_processed: int
    members_saved: int
    duplicates_found: int
    error_message: Optional[str]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime
    account: Optional[AccountOut] = None
    group: Optional[GroupOut] = None

    class Config:
        from_attributes = True


# Lead Schemas
class LeadUpdate(BaseModel):
    status: Optional[LeadStatus] = None
    notes: Optional[str] = None


class LeadOut(BaseModel):
    id: int
    telegram_user_id: str
    name: Optional[str]
    username: Optional[str]
    phone: Optional[str]
    source_group_name: Optional[str]
    status: LeadStatus
    notes: Optional[str]
    import_date: datetime

    class Config:
        from_attributes = True


# Activity Log Schemas
class ActivityLogOut(BaseModel):
    id: int
    action: str
    description: Optional[str]
    entity_type: Optional[str]
    user: str
    level: str
    created_at: datetime

    class Config:
        from_attributes = True


# Scrape History Schemas
class ScrapeHistoryOut(BaseModel):
    id: int
    group_name: Optional[str]
    total_members: int
    imported_members: int
    duplicates: int
    duration_seconds: Optional[int]
    status: str
    started_at: Optional[datetime]
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


# Dashboard Stats
class DashboardStats(BaseModel):
    total_accounts: int
    total_groups: int
    total_leads: int
    running_jobs: int
    completed_jobs: int
    today_imports: int


# Paginated Response
class PaginatedResponse(BaseModel):
    items: List
    total: int
    page: int
    page_size: int
    total_pages: int
