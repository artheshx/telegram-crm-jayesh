from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.db.session import get_db
from app.models.models import Account, AccountStatus
from app.schemas.schemas import AccountCreate, AccountOut, AccountOTPVerify
from app.services.telegram_service import send_code_request, sign_in_with_code
from app.services.activity_service import log_activity
from typing import List, Dict
import asyncio

router = APIRouter()

# Temp store for OTP sessions
otp_sessions: Dict[str, str] = {}


@router.get("/", response_model=List[AccountOut])
def list_accounts(db: Session = Depends(get_db)):
    return db.query(Account).filter(Account.is_active == True).order_by(Account.created_at.desc()).all()


@router.post("/send-otp")
def send_otp(data: AccountCreate, db: Session = Depends(get_db)):
    existing = db.query(Account).filter(Account.phone_number == data.phone_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="Phone number already registered")
    try:
        phone_code_hash = asyncio.get_event_loop().run_until_complete(
            send_code_request(data.api_id, data.api_hash, data.phone_number)
        )
        otp_sessions[data.phone_number] = {
            "api_id": data.api_id,
            "api_hash": data.api_hash,
            "phone_code_hash": phone_code_hash,
        }
        log_activity(db, "otp_sent", f"OTP sent to {data.phone_number}")
        return {"message": "OTP sent", "phone_code_hash": phone_code_hash}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/verify-otp", response_model=AccountOut)
def verify_otp(data: AccountOTPVerify, db: Session = Depends(get_db)):
    session_data = otp_sessions.get(data.phone_number)
    if not session_data:
        raise HTTPException(status_code=400, detail="No pending OTP for this number")
    try:
        session_string, me = asyncio.get_event_loop().run_until_complete(
            sign_in_with_code(
                session_data["api_id"],
                session_data["api_hash"],
                data.phone_number,
                data.code,
                data.phone_code_hash,
                data.password,
            )
        )
        account = Account(
            phone_number=data.phone_number,
            name=f"{me.first_name or ''} {me.last_name or ''}".strip(),
            username=me.username,
            api_id=session_data["api_id"],
            api_hash=session_data["api_hash"],
            session_string=session_string,
            status=AccountStatus.ONLINE,
            last_login=datetime.now(timezone.utc),
            last_active=datetime.now(timezone.utc),
        )
        db.add(account)
        db.commit()
        db.refresh(account)
        del otp_sessions[data.phone_number]
        log_activity(db, "account_added", f"Account {data.phone_number} added successfully", "account", account.id)
        return account
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{account_id}")
def delete_account(account_id: int, db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    phone = account.phone_number
    account.is_active = False
    account.status = AccountStatus.OFFLINE
    db.commit()
    log_activity(db, "account_removed", f"Account {phone} removed", "account", account_id)
    return {"message": "Account removed"}


@router.post("/{account_id}/reconnect")
def reconnect_account(account_id: int, db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    account.status = AccountStatus.ONLINE
    account.last_active = datetime.now(timezone.utc)
    db.commit()
    log_activity(db, "account_reconnected", f"Account {account.phone_number} reconnected", "account", account_id)
    return {"message": "Account reconnected"}
