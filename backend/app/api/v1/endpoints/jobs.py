from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from app.db.session import get_db
from app.models.models import ScrapingJob
from app.schemas.schemas import ScrapingJobOut
from typing import List, Optional

router = APIRouter()


@router.get("/", response_model=List[ScrapingJobOut])
def list_jobs(status: Optional[str] = None, skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    q = db.query(ScrapingJob).options(joinedload(ScrapingJob.account), joinedload(ScrapingJob.group))
    if status:
        q = q.filter(ScrapingJob.status == status)
    return q.order_by(ScrapingJob.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{job_id}", response_model=ScrapingJobOut)
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(ScrapingJob).options(
        joinedload(ScrapingJob.account), joinedload(ScrapingJob.group)
    ).filter(ScrapingJob.id == job_id).first()
    if not job:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Job not found")
    return job
