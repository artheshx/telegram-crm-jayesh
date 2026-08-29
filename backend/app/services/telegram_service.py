import asyncio
import re
from telethon import TelegramClient
from telethon.sessions import StringSession
from telethon.errors import (
    FloodWaitError,
    PhoneCodeExpiredError,
    PhoneCodeInvalidError,
    SessionPasswordNeededError,
)
from telethon.tl.functions.channels import GetFullChannelRequest
from telethon.tl.functions.channels import InviteToChannelRequest
from telethon.tl.functions.channels import GetParticipantRequest
from app.db.session import SessionLocal
from app.models.models import (
    Account,
    Campaign,
    CampaignMode,
    CampaignRecipient,
    CampaignStatus,
    Group,
    Lead,
    LeadStatus,
    RecipientStatus,
    ScrapeHistory,
    ScrapingJob,
    JobStatus,
    AccountStatus,
)
from app.services.activity_service import log_activity
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

# Global registry to hold active client connections to avoid MTProto key conflicts
active_clients = {}
active_clients_lock = asyncio.Lock()

async def get_telegram_client(account) -> TelegramClient:
    async with active_clients_lock:
        if account.id in active_clients:
            client, old_session = active_clients[account.id]
            if old_session == account.session_string:
                try:
                    if not client.is_connected():
                        await client.connect()
                    return client
                except Exception as e:
                    logger.warning("Cached client connection failed, will recreate: %s", e)
            
            # Session string has changed, or connection check failed; close old client
            try:
                await client.disconnect()
            except Exception:
                pass
            active_clients.pop(account.id, None)

        client = TelegramClient(StringSession(account.session_string), int(account.api_id), account.api_hash)
        await client.connect()
        active_clients[account.id] = (client, account.session_string)
        return client


def _render_message(template: str, lead: Lead, target_url: str = None) -> str:
    text = template or ""
    replacements = {
        "{name}": lead.name or "",
        "{username}": f"@{lead.username}" if lead.username else "",
        "{phone}": lead.phone or "",
        "{target_url}": target_url or "",
    }
    for token, value in replacements.items():
        text = text.replace(token, value)
    return text.strip()


def _account_ids(campaign: Campaign) -> list[int]:
    return [int(account_id) for account_id in (campaign.account_ids or "").split(",") if account_id.strip()]


def _reset_account_counters_if_needed(account: Account):
    now = datetime.now(timezone.utc)
    if not account.counters_reset_at or account.counters_reset_at.date() != now.date():
        account.messages_sent_today = 0
        account.invites_sent_today = 0
        account.counters_reset_at = now


def _select_account(db, account_ids: list[int], mode: CampaignMode):
    accounts = (
        db.query(Account)
        .filter(Account.id.in_(account_ids), Account.is_active == True, Account.status == AccountStatus.ONLINE)
        .order_by(Account.last_active.asc().nullsfirst(), Account.id.asc())
        .all()
    )
    for account in accounts:
        _reset_account_counters_if_needed(account)
        if mode == CampaignMode.DIRECT_ADD:
            if (account.invites_sent_today or 0) < (account.daily_invite_limit or 40):
                return account
        elif (account.messages_sent_today or 0) < (account.daily_message_limit or 100):
            return account
    return None


async def _resolve_lead_entity(client: TelegramClient, lead: Lead, db):
    if lead.username:
        try:
            return await client.get_entity(lead.username)
        except Exception as e:
            logger.warning("Failed to resolve by username @%s: %s", lead.username, e)

    if lead.source_group_id:
        from app.models.models import Group
        group = db.query(Group).filter(Group.id == lead.source_group_id).first()
        if group and group.url:
            try:
                group_entity = await client.get_entity(group.url)
                participant = await client(GetParticipantRequest(group_entity, int(lead.telegram_user_id)))
                return participant.user
            except Exception as e:
                logger.warning("Could not resolve user %s via group %s: %s", lead.telegram_user_id, group.url, e)

    return await client.get_entity(int(lead.telegram_user_id))


async def run_campaign(campaign_id: int):
    db = SessionLocal()

    try:
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not campaign:
            return

        campaign.status = CampaignStatus.RUNNING
        campaign.started_at = datetime.now(timezone.utc)
        db.commit()

        account_ids = _account_ids(campaign)
        target_entity_cache = {}

        while True:
            db.refresh(campaign)
            if campaign.status == CampaignStatus.STOPPED:
                break

            recipient = (
                db.query(CampaignRecipient)
                .filter(
                    CampaignRecipient.campaign_id == campaign.id,
                    CampaignRecipient.status == RecipientStatus.QUEUED,
                )
                .order_by(CampaignRecipient.id.asc())
                .first()
            )
            if not recipient:
                break

            lead = db.query(Lead).filter(Lead.id == recipient.lead_id).first()
            if not lead:
                recipient.status = RecipientStatus.SKIPPED
                recipient.error_message = "Lead not found"
                campaign.processed_count += 1
                db.commit()
                continue

            account = _select_account(db, account_ids, campaign.mode)
            if not account:
                campaign.status = CampaignStatus.FAILED
                campaign.error_message = "No online account is available below its configured threshold"
                db.commit()
                break

            recipient.account_id = account.id
            recipient.status = RecipientStatus.PROCESSING
            recipient.attempted_at = datetime.now(timezone.utc)
            db.commit()

            try:
                client = await get_telegram_client(account)
                if not await client.is_user_authorized():
                    account.status = AccountStatus.UNAUTHORIZED
                    db.commit()
                    raise Exception(f"Account {account.phone_number} is not authorized")
            except Exception as e:
                recipient.status = RecipientStatus.FAILED
                recipient.error_message = f"Connection failed: {str(e)}"
                recipient.completed_at = datetime.now(timezone.utc)
                campaign.failed_count += 1
                campaign.processed_count += 1
                db.commit()
                continue

            try:
                if campaign.mode == CampaignMode.DIRECT_ADD:
                    if not campaign.target_url:
                        raise ValueError("Target channel or group URL is required")
                    target = target_entity_cache.get(account.id)
                    if not target:
                        target = await client.get_entity(campaign.target_url)
                        target_entity_cache[account.id] = target
                    user_entity = await _resolve_lead_entity(client, lead, db)
                    await client(InviteToChannelRequest(target, [user_entity]))
                    recipient.status = RecipientStatus.INVITED
                    lead.status = LeadStatus.CONTACTED
                    account.invites_sent_today = (account.invites_sent_today or 0) + 1
                    campaign.success_count += 1

                else:
                    message = _render_message(campaign.message_template, lead, campaign.target_url)
                    if campaign.mode == CampaignMode.INVITE_LINK and campaign.target_url and campaign.target_url not in message:
                        message = f"{message}\n\n{campaign.target_url}".strip()
                    if not message:
                        raise ValueError("Message text is required")
                    user_entity = await _resolve_lead_entity(client, lead, db)
                    sent = await client.send_message(user_entity, message)
                    recipient.status = RecipientStatus.MESSAGED
                    recipient.message_text = message
                    recipient.telegram_message_id = str(getattr(sent, "id", ""))
                    lead.status = LeadStatus.CONTACTED
                    account.messages_sent_today = (account.messages_sent_today or 0) + 1
                    campaign.success_count += 1

                recipient.completed_at = datetime.now(timezone.utc)
                account.last_active = datetime.now(timezone.utc)

            except FloodWaitError as e:
                if e.seconds <= 60:
                    logger.info("Short flood wait of %d seconds. Sleeping and retrying...", e.seconds)
                    await asyncio.sleep(e.seconds)
                    recipient.status = RecipientStatus.QUEUED
                    db.commit()
                    continue
                else:
                    account.status = AccountStatus.FLOOD_WAIT
                    recipient.status = RecipientStatus.FAILED
                    recipient.error_message = f"Flood wait: {e.seconds}s"
                    recipient.completed_at = datetime.now(timezone.utc)
                    campaign.failed_count += 1
                    db.commit()
                    log_activity(db, "campaign_flood_wait", f"Flood wait on {account.phone_number}: {e.seconds}s", "account", account.id, level="error")
            except Exception as e:
                recipient.status = RecipientStatus.FAILED
                recipient.error_message = str(e)
                recipient.completed_at = datetime.now(timezone.utc)
                lead.status = LeadStatus.FAILED
                campaign.failed_count += 1

            campaign.processed_count += 1
            db.commit()
            await asyncio.sleep(max(campaign.delay_seconds or 0, 0))

        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if campaign and campaign.status not in (CampaignStatus.FAILED, CampaignStatus.STOPPED):
            campaign.status = CampaignStatus.COMPLETED
            campaign.completed_at = datetime.now(timezone.utc)
            db.commit()
            log_activity(db, "campaign_completed", f"Campaign {campaign.name} completed", "campaign", campaign.id)

    except Exception as e:
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if campaign:
            campaign.status = CampaignStatus.FAILED
            campaign.error_message = str(e)
            campaign.completed_at = datetime.now(timezone.utc)
            db.commit()
        log_activity(db, "campaign_failed", f"Campaign failed: {str(e)}", "campaign", campaign_id, level="error")
    finally:
        db.close()


async def update_follow_up_leads():
    db = SessionLocal()
    try:
        campaigns = db.query(Campaign).filter(Campaign.status == CampaignStatus.COMPLETED).all()
        now = datetime.now(timezone.utc)
        for campaign in campaigns:
            cutoff_hours = campaign.follow_up_after_hours or 24
            recipients = (
                db.query(CampaignRecipient)
                .join(Lead, CampaignRecipient.lead_id == Lead.id)
                .filter(
                    CampaignRecipient.campaign_id == campaign.id,
                    CampaignRecipient.status.in_([RecipientStatus.MESSAGED, RecipientStatus.INVITED]),
                    CampaignRecipient.reply_detected_at.is_(None),
                    Lead.status == LeadStatus.CONTACTED,
                )
                .all()
            )
            for recipient in recipients:
                if recipient.completed_at and (now - recipient.completed_at).total_seconds() >= cutoff_hours * 3600:
                    recipient.status = RecipientStatus.FOLLOW_UP
                    recipient.lead.status = LeadStatus.FOLLOW_UP
        db.commit()
    finally:
        db.close()


async def poll_recent_replies():
    db = SessionLocal()
    try:
        accounts = (
            db.query(Account)
            .filter(Account.is_active == True, Account.status == AccountStatus.ONLINE)
            .all()
        )
        for account in accounts:
            try:
                client = await get_telegram_client(account)
                if not await client.is_user_authorized():
                    account.status = AccountStatus.UNAUTHORIZED
                    db.commit()
                    continue

                async for dialog in client.iter_dialogs(limit=100):
                    if not dialog.is_user:
                        continue
                    message = dialog.message
                    if not message or getattr(message, "out", False):
                        continue
                    sender_id = str(getattr(message, "sender_id", "") or "")
                    if not sender_id:
                        continue

                    lead = (
                        db.query(Lead)
                        .filter(
                            Lead.telegram_user_id == sender_id,
                            Lead.status.in_([LeadStatus.CONTACTED, LeadStatus.FOLLOW_UP]),
                        )
                        .first()
                    )
                    if not lead:
                        continue

                    lead.status = LeadStatus.GOOD_LEAD
                    recipient = (
                        db.query(CampaignRecipient)
                        .filter(CampaignRecipient.lead_id == lead.id)
                        .order_by(CampaignRecipient.completed_at.desc().nullslast())
                        .first()
                    )
                    if recipient and not recipient.reply_detected_at:
                        recipient.status = RecipientStatus.REPLIED
                        recipient.reply_detected_at = datetime.now(timezone.utc)
                    log_activity(db, "lead_replied", f"{lead.name or lead.telegram_user_id} replied", "lead", lead.id)
                db.commit()
            except Exception as e:
                logger.warning("Reply polling failed for account %s: %s", account.phone_number, e)
    except Exception as e:
        logger.warning("Reply polling database or general failure: %s", e)
    finally:
        db.close()


async def campaign_maintenance_loop():
    while True:
        await poll_recent_replies()
        await update_follow_up_leads()
        await asyncio.sleep(60)


async def send_code_request(api_id: str, api_hash: str, phone: str):
    """Initiate OTP for new account login."""
    client = TelegramClient(StringSession(), int(api_id), api_hash)
    try:
        await client.connect()
        result = await client.send_code_request(phone)
        return {
            "phone_code_hash": result.phone_code_hash,
            "login_session_string": client.session.save(),
        }
    finally:
        await client.disconnect()


async def sign_in_with_code(
    api_id: str,
    api_hash: str,
    phone: str,
    code: str,
    phone_code_hash: str,
    password: str = None,
    login_session_string: str = None,
):
    code = re.sub(r"\s+", "", code or "")
    client = TelegramClient(StringSession(login_session_string), int(api_id), api_hash)

    try:
        await client.connect()

        try:
            await client.sign_in(
                phone=phone,
                code=code,
                phone_code_hash=phone_code_hash,
            )
        except PhoneCodeExpiredError:
            raise ValueError("OTP expired. Please request a new code.")
        except PhoneCodeInvalidError:
            raise ValueError("Invalid OTP. Please check the code and try again.")
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

        client = await get_telegram_client(account)
        if not await client.is_user_authorized():
            raise Exception("Account not authorized")

        job.current_step = "Resolving group"
        db.commit()

        entity = await client.get_entity(group.url)
        full = await client(GetFullChannelRequest(entity))
        total = full.full_chat.participants_count or 0

        group.telegram_id = str(getattr(entity, "id", "")) or group.telegram_id
        group.name = getattr(entity, "title", None) or group.name
        group.username = getattr(entity, "username", None) or group.username
        group.member_count = total

        job.current_step = "Scraping members"
        db.commit()

        members_saved = 0
        duplicates = 0
        processed = 0

        # Optimization: cache existing lead user IDs in memory to avoid 1 DB query per participant
        existing_lead_ids = set(
            row[0] for row in db.query(Lead.telegram_user_id).filter(Lead.telegram_user_id.isnot(None)).all()
        )

        async for user in client.iter_participants(entity):
            # Batch checks on job status to avoid db request bottleneck
            if processed % 50 == 0:
                db.refresh(job)
            if job.status == JobStatus.STOPPED:
                break
            processed += 1

            if str(user.id) in existing_lead_ids:
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
                existing_lead_ids.add(str(user.id))
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
        db.close()





