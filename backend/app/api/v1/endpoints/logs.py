from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.models import ActivityLog
from app.schemas.schemas import ActivityLogOut
from typing import List, Optional

router = APIRouter()


@router.get("/", response_model=List[ActivityLogOut])
def list_logs(level: Optional[str] = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    q = db.query(ActivityLog)
    if level:
        q = q.filter(ActivityLog.level == level)
    return q.order_by(ActivityLog.created_at.desc()).offset(skip).limit(limit).all()
