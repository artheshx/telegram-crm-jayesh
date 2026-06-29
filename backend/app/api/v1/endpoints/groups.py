from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.models import Group
from app.schemas.schemas import GroupOut
from typing import List

router = APIRouter()


@router.get("/", response_model=List[GroupOut])
def list_groups(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    return db.query(Group).order_by(Group.created_at.desc()).offset(skip).limit(limit).all()
