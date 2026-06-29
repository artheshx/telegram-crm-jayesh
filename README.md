# Telegram Community CRM v1

A modern, production-ready CRM platform for managing multiple Telegram accounts, scraping group members, and tracking leads — built with FastAPI, React, and PostgreSQL.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Tailwind CSS + React Query |
| Backend | FastAPI + Telethon + SQLAlchemy |
| Database | PostgreSQL 16 |
| Deployment | Docker + Docker Compose |

---

## Features

- **Multi-Account Management** — Add Telegram accounts via OTP + optional 2FA, monitor status
- **Group Scraper** — Scrape members from any public Telegram group with real-time progress
- **Lead Database** — Auto-deduplication, status tracking, notes, CSV export
- **Job Manager** — Track background scraping jobs with live progress bars
- **Activity Logs** — Full audit trail of all platform actions
- **Dashboard** — Platform-wide statistics at a glance

---

## Quick Start (Docker)

### Prerequisites
- Docker + Docker Compose installed
- A Telegram API ID and API Hash from [my.telegram.org](https://my.telegram.org)

### 1. Clone and configure

```bash
git clone <your-repo>
cd telegram-crm

# Copy and edit backend environment
cp backend/.env.example backend/.env
# Edit backend/.env with your SECRET_KEY values
```

### 2. Start all services

```bash
docker-compose up --build
```

This starts:
- **PostgreSQL** on port `5432`
- **FastAPI backend** on port `8000`
- **React frontend** on port `3000`

### 3. Open the app

Visit [http://localhost:3000](http://localhost:3000)

API docs available at [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs)

---

## Local Development (without Docker)

### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up PostgreSQL and configure .env
cp .env.example .env
# Edit .env: set DATABASE_URL to your local PostgreSQL

# Run database migrations (auto on startup)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173) — API calls are proxied to `localhost:8000`.

---

## Folder Structure

```
telegram-crm/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── endpoints/
│   │   │       │   ├── accounts.py    # Account management + OTP
│   │   │       │   ├── dashboard.py   # Stats + recent activity
│   │   │       │   ├── groups.py      # Group listing
│   │   │       │   ├── jobs.py        # Job tracking
│   │   │       │   ├── leads.py       # Lead CRUD + CSV export
│   │   │       │   ├── logs.py        # Activity logs
│   │   │       │   └── scraper.py     # Start/stop scraping
│   │   │       └── router.py
│   │   ├── core/
│   │   │   └── config.py              # Settings from .env
│   │   ├── db/
│   │   │   ├── base.py                # SQLAlchemy base
│   │   │   └── session.py             # DB session + engine
│   │   ├── models/
│   │   │   └── models.py              # All ORM models
│   │   ├── schemas/
│   │   │   └── schemas.py             # Pydantic request/response schemas
│   │   ├── services/
│   │   │   ├── activity_service.py    # Activity logging helper
│   │   │   └── telegram_service.py    # Telethon OTP + scraping logic
│   │   └── main.py                    # FastAPI app + CORS + lifespan
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── accounts/
│   │   │   │   └── Accounts.tsx       # Account manager + OTP flow
│   │   │   ├── dashboard/
│   │   │   │   ├── Dashboard.tsx      # Stats + activity feed
│   │   │   │   ├── Groups.tsx         # Groups list
│   │   │   │   └── Settings.tsx       # Platform info + links
│   │   │   ├── jobs/
│   │   │   │   └── Jobs.tsx           # Job tracker with tabs
│   │   │   ├── layout/
│   │   │   │   ├── Layout.tsx         # Page wrapper
│   │   │   │   └── Sidebar.tsx        # Navigation sidebar
│   │   │   ├── leads/
│   │   │   │   └── Leads.tsx          # Lead database + export
│   │   │   ├── logs/
│   │   │   │   └── Logs.tsx           # Activity log viewer
│   │   │   ├── scraper/
│   │   │   │   └── Scraper.tsx        # Scraper UI + history
│   │   │   └── ui/
│   │   │       └── index.tsx          # Shared UI components
│   │   ├── lib/
│   │   │   ├── api.ts                 # Axios API client
│   │   │   └── toast.tsx              # Toast notification system
│   │   ├── types/
│   │   │   └── index.ts               # TypeScript interfaces
│   │   ├── App.tsx                    # Routes
│   │   ├── main.tsx                   # React entry point
│   │   └── index.css                  # Tailwind + global styles
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
│
├── docker-compose.yml
└── README.md
```

---

## Database Schema

### `accounts`
| Column | Type | Description |
|--------|------|-------------|
| id | Integer PK | Auto increment |
| phone_number | String UNIQUE | Telegram phone |
| name | String | Display name |
| username | String | @username |
| api_id | String | Telegram API ID |
| api_hash | String | Telegram API Hash |
| session_string | Text | Telethon session |
| status | Enum | online/offline/flood_wait/unauthorized |
| last_active | DateTime | Last activity timestamp |
| last_login | DateTime | Last successful login |
| is_active | Boolean | Soft delete flag |

### `groups`
| Column | Type | Description |
|--------|------|-------------|
| id | Integer PK | Auto increment |
| telegram_id | String UNIQUE | Telegram channel ID |
| name | String | Group display name |
| username | String | @username |
| url | String | Full t.me URL |
| member_count | Integer | Total members |
| last_scraped | DateTime | Last scrape timestamp |

### `scraping_jobs`
| Column | Type | Description |
|--------|------|-------------|
| id | Integer PK | Job ID |
| account_id | FK → accounts | Which account ran this |
| group_id | FK → groups | Which group was scraped |
| status | Enum | queued/running/completed/failed/stopped |
| progress | Float | 0–100 percentage |
| members_processed | Integer | Total iterated |
| members_saved | Integer | New leads saved |
| duplicates_found | Integer | Skipped duplicates |
| error_message | Text | Error detail if failed |
| started_at | DateTime | Job start time |
| completed_at | DateTime | Job end time |

### `scrape_history`
Snapshot record created on job completion. Preserves history even if jobs are cleaned.

### `leads`
| Column | Type | Description |
|--------|------|-------------|
| id | Integer PK | Auto increment |
| telegram_user_id | String UNIQUE | Unique deduplication key |
| name | String | Full name |
| username | String | @username |
| phone | String | Phone if public |
| source_group_id | FK → groups | Where this lead was scraped |
| source_group_name | String | Denormalized for speed |
| assigned_account_id | FK → accounts | Which account scraped them |
| status | Enum | new/contacted/replied/closed |
| notes | Text | Free-form CRM notes |
| import_date | DateTime | When this lead was imported |

### `activity_logs`
Full audit log — every action, error, and event.

---

## API Reference

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/dashboard/stats` | Global platform stats |
| GET | `/api/v1/dashboard/recent-activity` | Last 10 log entries |

### Accounts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/accounts/` | List all accounts |
| POST | `/api/v1/accounts/send-otp` | Send OTP to phone |
| POST | `/api/v1/accounts/verify-otp` | Verify OTP and create account |
| DELETE | `/api/v1/accounts/{id}` | Remove account (soft delete) |
| POST | `/api/v1/accounts/{id}/reconnect` | Mark as online |

### Scraper
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/scraper/start` | Start a scraping job |
| POST | `/api/v1/scraper/stop/{job_id}` | Signal job to stop |
| GET | `/api/v1/scraper/history` | Scrape history records |

### Jobs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/jobs/` | List jobs (filter by `?status=`) |
| GET | `/api/v1/jobs/{id}` | Get job details |

### Leads
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/leads/` | List leads (search, status filter) |
| GET | `/api/v1/leads/count` | Count leads |
| PATCH | `/api/v1/leads/{id}` | Update status or notes |
| GET | `/api/v1/leads/export/csv` | Download leads as CSV |

### Logs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/logs/` | Activity logs (filter by `?level=`) |

---

## Environment Variables

```env
# Required
DATABASE_URL=postgresql://postgres:postgres@db:5432/telegram_crm
SECRET_KEY=your-super-secret-key-min-32-chars
SESSION_ENCRYPTION_KEY=your-32-char-encryption-key

# Optional
CORS_ORIGINS=["http://localhost:3000"]
```

---

## Security Notes

- **Session strings** give full access to a Telegram account — treat them like passwords
- Change `SECRET_KEY` and `SESSION_ENCRYPTION_KEY` before any production deployment
- Run behind HTTPS in production (use a reverse proxy like Caddy or Nginx)
- Consider encrypting session strings at rest using the `SESSION_ENCRYPTION_KEY`
- Never expose port `5432` publicly

---

## Extending the Platform

The codebase is modular and straightforward to extend:

- **Add a new endpoint** → create a file in `backend/app/api/v1/endpoints/`, register in `router.py`
- **Add a new model** → extend `models/models.py`, add schema in `schemas/schemas.py`
- **Add a new page** → create component in `frontend/src/components/`, add route in `App.tsx` and nav item in `Sidebar.tsx`
- **Add message sending** → extend `telegram_service.py` with `client.send_message()`
- **Add analytics charts** → install `recharts` in frontend, query existing data

---

## Roadmap (v2+)

- [ ] Message sending / bulk outreach
- [ ] Advanced analytics with charts
- [ ] CRM workflows and automation
- [ ] Webhook notifications
- [ ] User authentication (multi-user)
- [ ] Encrypted session storage
- [ ] Rate limiting per account
- [ ] Scheduled scraping
