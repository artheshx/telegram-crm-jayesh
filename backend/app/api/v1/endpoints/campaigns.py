from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

from app.db.session import get_db
from app.models.models import (
    Account,
    Campaign,
    CampaignMode,
    CampaignRecipient,
    CampaignStatus,
    Lead,
    LeadStatus,
    RecipientStatus,
)
from app.schemas.schemas import CampaignCreate, CampaignOut, CampaignRecipientOut
from app.services.activity_service import log_activity
from app.services.telegram_service import run_campaign

router = APIRouter()


@router.get("/", response_model=List[CampaignOut])
def list_campaigns(db: Session = Depends(get_db)):
    return db.query(Campaign).order_by(Campaign.created_at.desc()).all()


@router.get("/{campaign_id}", response_model=CampaignOut)
def get_campaign(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign


@router.get("/{campaign_id}/recipients", response_model=List[CampaignRecipientOut])
def list_campaign_recipients(
    campaign_id: int,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    q = (
        db.query(CampaignRecipient)
        .options(joinedload(CampaignRecipient.lead), joinedload(CampaignRecipient.account))
        .filter(CampaignRecipient.campaign_id == campaign_id)
    )
    if status:
        q = q.filter(CampaignRecipient.status == status)
    return q.order_by(CampaignRecipient.id.desc()).offset(skip).limit(limit).all()


@router.post("/", response_model=CampaignOut)
def create_campaign(
    data: CampaignCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    if not data.account_ids:
        raise HTTPException(status_code=400, detail="Select at least one account")
    if data.mode in (CampaignMode.DIRECT_ADD, CampaignMode.INVITE_LINK) and not data.target_url:
        raise HTTPException(status_code=400, detail="Target channel or group URL is required")
    if data.mode == CampaignMode.MESSAGE and not data.message_template:
        raise HTTPException(status_code=400, detail="Message text is required")

    accounts = db.query(Account).filter(Account.id.in_(data.account_ids), Account.is_active == True).all()
    if not accounts:
        raise HTTPException(status_code=400, detail="No active accounts found")

    q = db.query(Lead)
    if data.lead_status_filter:
        q = q.filter(Lead.status == data.lead_status_filter)
    if data.source_group_filter:
        q = q.filter(Lead.source_group_name == data.source_group_filter)
    q = q.order_by(Lead.import_date.desc())
    if data.limit:
        q = q.limit(data.limit)
    leads = q.all()

    if not leads:
        raise HTTPException(status_code=400, detail="No leads match this campaign")

    campaign = Campaign(
        name=data.name,
        mode=data.mode,
        target_url=data.target_url,
        message_template=data.message_template,
        lead_status_filter=data.lead_status_filter,
        source_group_filter=data.source_group_filter,
        account_ids=",".join(str(account_id) for account_id in data.account_ids),
        delay_seconds=max(data.delay_seconds, 0),
        follow_up_after_hours=max(data.follow_up_after_hours, 1),
        total_recipients=len(leads),
        status=CampaignStatus.QUEUED,
    )
    db.add(campaign)
    db.flush()

    for lead in leads:
        db.add(CampaignRecipient(campaign_id=campaign.id, lead_id=lead.id, status=RecipientStatus.QUEUED))

    db.commit()
    db.refresh(campaign)

    log_activity(db, "campaign_created", f"Campaign {campaign.name} queued {len(leads)} leads", "campaign", campaign.id)
    background_tasks.add_task(run_campaign, campaign.id)
    return campaign


@router.post("/{campaign_id}/stop")
def stop_campaign(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if campaign.status not in (CampaignStatus.RUNNING, CampaignStatus.QUEUED):
        return {"message": "Campaign is not running"}
    campaign.status = CampaignStatus.STOPPED
    db.commit()
    log_activity(db, "campaign_stopped", f"Campaign {campaign.name} stopped", "campaign", campaign.id)
    return {"message": "Campaign stopped"}
