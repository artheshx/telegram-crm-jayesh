from fastapi import APIRouter
from app.api.v1.endpoints import accounts, groups, jobs, leads, logs, dashboard, scraper

api_router = APIRouter()

api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(accounts.router, prefix="/accounts", tags=["Accounts"])
api_router.include_router(groups.router, prefix="/groups", tags=["Groups"])
api_router.include_router(scraper.router, prefix="/scraper", tags=["Scraper"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["Jobs"])
api_router.include_router(leads.router, prefix="/leads", tags=["Leads"])
api_router.include_router(logs.router, prefix="/logs", tags=["Activity Logs"])
