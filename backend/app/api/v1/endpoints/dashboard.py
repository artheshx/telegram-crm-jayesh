from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone, date
from app.db.session import get_db
from app.models.models import Account, Group, Lead, ScrapingJob, JobStatus, ActivityLog
from app.schemas.schemas import DashboardStats, ActivityLogOut

router = APIRouter()


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db)):
    total_accounts = db.query(Account).filter(Account.is_active == True).count()
    total_groups = db.query(Group).count()
    total_leads = db.query(Lead).count()
    running_jobs = db.query(ScrapingJob).filter(ScrapingJob.status == JobStatus.RUNNING).count()
    completed_jobs = db.query(ScrapingJob).filter(ScrapingJob.status == JobStatus.COMPLETED).count()
    
    today_start = datetime.combine(date.today(), datetime.min.time()).replace(tzinfo=timezone.utc)
    today_imports = db.query(Lead).filter(Lead.import_date >= today_start).count()

    return DashboardStats(
        total_accounts=total_accounts,
        total_groups=total_groups,
        total_leads=total_leads,
        running_jobs=running_jobs,
        completed_jobs=completed_jobs,
        today_imports=today_imports,
    )


@router.get("/recent-activity")
def get_recent_activity(limit: int = 10, db: Session = Depends(get_db)):
    logs = db.query(ActivityLog).order_by(ActivityLog.created_at.desc()).limit(limit).all()
    return [ActivityLogOut.model_validate(l) for l in logs]
