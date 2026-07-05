from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio

from app.core.config import settings
from app.db.session import engine
from app.db.base import Base
from app.api.v1.router import api_router
from app.services.telegram_service import campaign_maintenance_loop


def apply_compat_migrations():
    """Small compatibility updates for installs without Alembic migrations."""
    if engine.dialect.name != "postgresql":
        return

    with engine.begin() as conn:
        lead_status_exists = conn.exec_driver_sql("SELECT to_regtype('leadstatus')").scalar()
        if lead_status_exists:
            for value in ("good_lead", "follow_up", "failed"):
                conn.exec_driver_sql(f"ALTER TYPE leadstatus ADD VALUE IF NOT EXISTS '{value}'")

        accounts_exists = conn.exec_driver_sql("SELECT to_regclass('accounts')").scalar()
        if accounts_exists:
            account_columns = [
                ("hourly_message_limit", "INTEGER DEFAULT 20"),
                ("daily_message_limit", "INTEGER DEFAULT 100"),
                ("daily_invite_limit", "INTEGER DEFAULT 40"),
                ("messages_sent_today", "INTEGER DEFAULT 0"),
                ("invites_sent_today", "INTEGER DEFAULT 0"),
                ("counters_reset_at", "TIMESTAMP WITH TIME ZONE"),
            ]
            for column, definition in account_columns:
                conn.exec_driver_sql(
                    f"ALTER TABLE accounts ADD COLUMN IF NOT EXISTS {column} {definition}"
                )


@asynccontextmanager
async def lifespan(app: FastAPI):
    apply_compat_migrations()
    Base.metadata.create_all(bind=engine)
    maintenance_task = asyncio.create_task(campaign_maintenance_loop())
    yield
    maintenance_task.cancel()


app = FastAPI(
    title="Telegram Community CRM",
    version="1.0.0",
    description="Multi-account Telegram CRM for lead management and group scraping",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
def health_check():
    return {"status": "ok", "version": "1.0.0"}
