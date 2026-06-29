from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.db.session import get_db
from app.models.models import Lead
from app.schemas.schemas import LeadOut, LeadUpdate
from typing import List, Optional
import csv
import io
from fastapi.responses import StreamingResponse

router = APIRouter()


@router.get("/", response_model=List[LeadOut])
def list_leads(
    search: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    q = db.query(Lead)
    if search:
        q = q.filter(
            or_(
                Lead.name.ilike(f"%{search}%"),
                Lead.username.ilike(f"%{search}%"),
                Lead.phone.ilike(f"%{search}%"),
                Lead.telegram_user_id.ilike(f"%{search}%"),
            )
        )
    if status:
        q = q.filter(Lead.status == status)
    return q.order_by(Lead.import_date.desc()).offset(skip).limit(limit).all()


@router.get("/count")
def count_leads(search: Optional[str] = None, status: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Lead)
    if search:
        q = q.filter(or_(Lead.name.ilike(f"%{search}%"), Lead.username.ilike(f"%{search}%")))
    if status:
        q = q.filter(Lead.status == status)
    return {"count": q.count()}


@router.patch("/{lead_id}", response_model=LeadOut)
def update_lead(lead_id: int, data: LeadUpdate, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if data.status is not None:
        lead.status = data.status
    if data.notes is not None:
        lead.notes = data.notes
    db.commit()
    db.refresh(lead)
    return lead


@router.get("/export/csv")
def export_leads_csv(status: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Lead)
    if status:
        q = q.filter(Lead.status == status)
    leads = q.all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Telegram ID", "Name", "Username", "Phone", "Source Group", "Status", "Notes", "Import Date"])
    for lead in leads:
        writer.writerow([
            lead.id, lead.telegram_user_id, lead.name, lead.username,
            lead.phone, lead.source_group_name, lead.status.value,
            lead.notes or "", lead.import_date,
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=leads.csv"},
    )
