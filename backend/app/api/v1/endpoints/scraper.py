from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.models import Group, ScrapingJob, JobStatus, Account, ScrapeHistory
from app.schemas.schemas import ScrapingJobCreate, ScrapingJobOut, ScrapeHistoryOut
from app.services.telegram_service import scrape_group
from app.services.activity_service import log_activity
from typing import List
import asyncio

router = APIRouter()


@router.post("/start", response_model=ScrapingJobOut)
def start_scraping(data: ScrapingJobCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.id == data.account_id, Account.is_active == True).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    # Create or get group
    group = db.query(Group).filter(Group.url == data.group_url).first()
    if not group:
        group = Group(url=data.group_url, name=data.group_url.split("/")[-1])
        db.add(group)
        db.commit()
        db.refresh(group)

    # Check for running job on same group
    existing = db.query(ScrapingJob).filter(
        ScrapingJob.group_id == group.id,
        ScrapingJob.status == JobStatus.RUNNING,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="A job is already running for this group")

    job = ScrapingJob(account_id=account.id, group_id=group.id, status=JobStatus.QUEUED)
    db.add(job)
    db.commit()
    db.refresh(job)

    log_activity(db, "scrape_started", f"Scraping started for {data.group_url}", "job", job.id)

    background_tasks.add_task(asyncio.run, scrape_group(job.id, db))

    db.refresh(job)
    return job


@router.post("/stop/{job_id}")
def stop_scraping(job_id: int, db: Session = Depends(get_db)):
    job = db.query(ScrapingJob).filter(ScrapingJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != JobStatus.RUNNING:
        raise HTTPException(status_code=400, detail="Job is not running")
    job.status = JobStatus.STOPPED
    db.commit()
    log_activity(db, "scrape_stopped", f"Scraping job {job_id} stopped by user", "job", job_id)
    return {"message": "Stop signal sent"}


@router.get("/history", response_model=List[ScrapeHistoryOut])
def get_scrape_history(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    return db.query(ScrapeHistory).order_by(ScrapeHistory.created_at.desc()).offset(skip).limit(limit).all()
