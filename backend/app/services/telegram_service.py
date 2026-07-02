import asyncio
from telethon import TelegramClient
from telethon.sessions import StringSession
from telethon.errors import FloodWaitError, SessionPasswordNeededError
from telethon.tl.functions.channels import GetFullChannelRequest
from app.db.session import SessionLocal
from app.models.models import Account, Group, Lead, ScrapingJob, ScrapeHistory, JobStatus, AccountStatus, LeadStatus
from app.services.activity_service import log_activity
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)


async def send_code_request(api_id: str, api_hash: str, phone: str):
    """Initiate OTP for new account login."""
    client = TelegramClient(StringSession(), int(api_id), api_hash)
    try:
        await client.connect()
        result = await client.send_code_request(phone)
        return result.phone_code_hash
    finally:
        await client.disconnect()


async def sign_in_with_code(
    api_id: str,
    api_hash: str,
    phone: str,
    code: str,
    phone_code_hash: str,
    password: str = None,
):
    client = TelegramClient(StringSession(), int(api_id), api_hash)

    try:
        await client.connect()

        try:
            await client.sign_in(
                phone=phone,
                code=code,
                phone_code_hash=phone_code_hash,
            )
        except SessionPasswordNeededError:
            if not password:
                raise ValueError("Two-factor authentication password is required")
            await client.sign_in(password=password)

        me = await client.get_me()
        session_string = client.session.save()

        return session_string, me

    except ValueError:
        raise
    except Exception:
        logger.exception("Telegram sign-in failed")
        raise

    finally:
        await client.disconnect()


async def scrape_group(job_id: int):
    """Main scraping task - runs as background task."""
    db = SessionLocal()
    client = None

    try:
        job = db.query(ScrapingJob).filter(ScrapingJob.id == job_id).first()
        if not job:
            return

        account = db.query(Account).filter(Account.id == job.account_id).first()
        group = db.query(Group).filter(Group.id == job.group_id).first()

        if not account or not group:
            job.status = JobStatus.FAILED
            job.error_message = "Account or group not found"
            db.commit()
            return

        job.status = JobStatus.RUNNING
        job.started_at = datetime.now(timezone.utc)
        job.current_step = "Connecting to Telegram"
        db.commit()

        client = TelegramClient(StringSession(account.session_string), int(account.api_id), account.api_hash)
        await client.connect()
        if not await client.is_user_authorized():
            raise Exception("Account not authorized")

        job.current_step = "Resolving group"
        db.commit()

        entity = await client.get_entity(group.url)
        full = await client(GetFullChannelRequest(entity))
        total = full.full_chat.participants_count

        group.telegram_id = str(getattr(entity, "id", "")) or group.telegram_id
        group.name = getattr(entity, "title", None) or group.name
        group.username = getattr(entity, "username", None) or group.username
        group.member_count = total or 0

        job.current_step = "Scraping members"
        db.commit()

        members_saved = 0
        duplicates = 0
        processed = 0

        async for user in client.iter_participants(entity):
            db.refresh(job)
            if job.status == JobStatus.STOPPED:
                break
            processed += 1

            existing = db.query(Lead).filter(Lead.telegram_user_id == str(user.id)).first()
            if existing:
                duplicates += 1
            else:
                lead = Lead(
                    telegram_user_id=str(user.id),
                    name=f"{user.first_name or ''} {user.last_name or ''}".strip() or None,
                    username=user.username,
                    phone=user.phone,
                    source_group_id=group.id,
                    source_group_name=group.name,
                    assigned_account_id=account.id,
                    status=LeadStatus.NEW,
                )
                db.add(lead)
                members_saved += 1

            job.members_processed = processed
            job.members_saved = members_saved
            job.duplicates_found = duplicates
            job.progress = min((processed / total * 100) if total > 0 else 0, 100)

            if processed % 50 == 0:
                db.commit()

            await asyncio.sleep(0.1)

        db.commit()
        job.status = JobStatus.COMPLETED if job.status != JobStatus.STOPPED else JobStatus.STOPPED
        job.completed_at = datetime.now(timezone.utc)
        job.current_step = "Completed" if job.status == JobStatus.COMPLETED else "Stopped"
        job.progress = 100 if job.status == JobStatus.COMPLETED else job.progress

        duration = int((job.completed_at - job.started_at).total_seconds())
        history = ScrapeHistory(
            group_id=group.id,
            account_id=account.id,
            group_name=group.name,
            total_members=total,
            imported_members=members_saved,
            duplicates=duplicates,
            duration_seconds=duration,
            status=job.status.value,
            started_at=job.started_at,
            completed_at=job.completed_at,
        )
        db.add(history)
        group.last_scraped = datetime.now(timezone.utc)
        db.commit()

        log_activity(db, "scrape_completed", f"Scraped {group.name}: {members_saved} new leads, {duplicates} duplicates", "group", group.id)

    except FloodWaitError as e:
        job = db.query(ScrapingJob).filter(ScrapingJob.id == job_id).first()
        if job:
            account = db.query(Account).filter(Account.id == job.account_id).first()
            job.status = JobStatus.FAILED
            job.error_message = f"Flood wait: {e.seconds}s"
            job.completed_at = datetime.now(timezone.utc)
            if account:
                account.status = AccountStatus.FLOOD_WAIT
            db.commit()
            if account:
                log_activity(db, "error", f"Flood wait on account {account.phone_number}", "account", account.id, level="error")
    except Exception as e:
        job = db.query(ScrapingJob).filter(ScrapingJob.id == job_id).first()
        if job:
            job.status = JobStatus.FAILED
            job.error_message = str(e)
            job.completed_at = datetime.now(timezone.utc)
            db.commit()
        log_activity(db, "error", f"Scraping failed: {str(e)}", "job", job_id, level="error")
    finally:
        if client:
            await client.disconnect()
        db.close()
