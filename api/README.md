# Haia — FastAPI Backend

## Prerequisites
- Python 3.11+
- A running Supabase project with the schema from `supabase/migrations/001_initial_schema.sql` applied

## Setup

```bash
cd api

# Create a virtual environment
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy env vars (fill in your real values)
cp ../.env.example .env
```

## Run locally

```bash
uvicorn main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

## Project structure

```
api/
├── main.py                  # App entry point, router mounting
├── requirements.txt
├── gemini_client.py         # All Gemini API calls
├── prompts/                 # Versioned prompt files (one per parsing task)
│   ├── parse_task.txt
│   ├── parse_schedule.txt
│   └── parse_syllabus.txt
├── core/
│   ├── config.py            # Pydantic settings (loads from .env)
│   ├── supabase.py          # Service-role + anon Supabase client factories
│   └── dependencies.py      # get_current_user FastAPI dependency
├── tasks/                   # Quests — one-off tasks and deadlines
├── habits/                  # Recurring habits + habit_logs
├── goals/                   # Long-term goals
├── courses/                 # COR/schedule courses
├── gamification/            # XP events, streaks, stats
├── chat/                    # Unified AI chatbot (Telegram + web)
├── parsing/                 # Central AI parsing pipeline
├── integrations/            # Google OAuth, Telegram webhook, email inbound
└── subjects/                # Subject / life-area groupings
```

## Environment variables

See `../.env.example` for the full list. The minimum required to start the API:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`

## Running tests

```bash
pytest
```

Tests use a separate Supabase test project. Never run tests against the production DB.
All external services (Gemini, Google Calendar, Telegram, Mailgun) are mocked in tests.

## Build order

See `../agents.md §7` for the recommended feature build sequence.
