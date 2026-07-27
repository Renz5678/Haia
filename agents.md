# Haia — Agent Reference & Progress Tracker

> **To every coding agent reading this:**
> Read this entire file before writing or changing any code. This is both your orientation document and the live tracker of what has been built. When you add a feature, fix a bug, or make an architectural change, **you must update the relevant section(s) of this file in the same session**. Do not leave this file stale. The project drifts when this document drifts.
>
> The single source of truth for project decisions is [`CONTEXT.md`](./CONTEXT.md). If anything in this file conflicts with `CONTEXT.md`, `CONTEXT.md` wins — and you should flag the conflict rather than silently ignoring it.

---

## 1. What You're Building

**Haia** is a personal life-and-school management system that wraps productivity in game mechanics. Think: RPG quest log meets a student planner, powered by a conversational AI that lives on both Telegram and a web dashboard.

**The core loop in one sentence:** the user mentions something they need to do (in chat, via Telegram, or by uploading a photo/doc), Gemini parses it into a structured item, it gets saved to Supabase, and completing it earns XP, builds streaks, and levels the user up.

**Tone matters:** "Haia" is a ninja battle-cry. The app has energy. UI copy uses game language (Quests, XP, streaks, Character Sheet) — not generic productivity language (Tasks, Points, History). Honor this in any UI string you write.

---

## 2. Tech Stack (Immutable Unless Flagged)

| Layer | Technology |
|---|---|
| Frontend | Next.js + React (TypeScript) |
| Backend | FastAPI (Python) |
| Database / Auth | Supabase (Postgres + RLS) |
| AI Parsing | Gemini API (Flash / Flash-Lite) |
| Bot Interface | Telegram Bot API |
| Calendar | Google Calendar API |
| Email Intake | Mailgun or Postmark (inbound parse webhook) |
| Background Jobs | Supabase `pg_cron` or APScheduler |
| Schedule PNG Renderer | Playwright (headless browser) |
| Hosting | Vercel (frontend), Railway/Fly.io (backend), Supabase Cloud (DB) |
| Monitoring | Sentry (optional but recommended) |

**Do not swap any layer without explicitly flagging it to the user.** The stack above is the contract.

---

## 3. Project Structure

```
/
├── web/                             # Next.js 15 frontend (App Router, TypeScript)
│   ├── src/
│   │   ├── app/                     # App Router pages
│   │   ├── components/              # Shared UI components
│   │   └── lib/
│   │       ├── supabase/
│   │       │   ├── client.ts        # Browser Supabase client
│   │       │   └── server.ts        # Server Supabase client (SSR)
│   │       └── api.ts               # Typed FastAPI client
│   ├── .env.local.example
│   └── package.json
├── api/                             # FastAPI backend
│   ├── main.py                      # Entry point, router mounting
│   ├── gemini_client.py             # All Gemini API calls
│   ├── requirements.txt
│   ├── prompts/                     # Versioned Gemini prompt files
│   │   ├── parse_task.txt
│   │   ├── parse_schedule.txt
│   │   └── parse_syllabus.txt
│   ├── core/
│   │   ├── config.py            # Pydantic settings (env vars)
│   │   ├── supabase.py          # Service-role + anon client factories
│   │   └── dependencies.py      # get_current_user JWT dependency
│   ├── tasks/                   # router.py, service.py, schemas.py
│   ├── habits/
│   ├── goals/
│   ├── courses/
│   ├── gamification/
│   ├── chat/
│   ├── parsing/
│   ├── integrations/
│   ├── subjects/
│   └── README.md
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
├── CONTEXT.md
├── agents.md
├── .env.example
└── .gitignore
```

Files are organized **by domain** in the backend (e.g. `tasks/`, `habits/`), not by technical layer. One component per file on the frontend; filename matches component name.

---

## 4. Key Architecture Rules

1. **All input channels (Telegram + web) route to the same FastAPI endpoints.** No logic forks per channel.
2. **Every Gemini output is validated against a Pydantic schema** before it touches the database. Never trust raw model output.
3. **Chat history is stored per user, not per channel** (`chat_messages` table) — so a conversation on Telegram continues seamlessly on the web.
4. **Every external API call handles failure explicitly** (timeouts, rate limits, malformed responses). User-facing error messages must be in-tone ("Couldn't quite parse that — try rephrasing?"), not raw stack traces.
5. **All secrets are environment variables.** Never hardcode a credential. Keep `.env.example` current.
6. **RLS is enforced on every Supabase table** containing user data. No cross-user reads/writes by default.
7. **Schema changes use migration files.** Never hand-edit the prod schema via the Supabase dashboard without a committed migration.

---

## 5. Data Model (Tables)

| Table | Responsibility |
|---|---|
| `users` | Auth profile, timezone, semester dates |
| `subjects` | School subjects / life areas for grouping |
| `tasks` | One-off items and deadlines; tracks source (typed, Telegram, email, photo) |
| `habits` | Recurring personal habits |
| `habit_logs` | Individual completions; used to compute streaks |
| `goals` | Long-term targets that tasks/habits roll up into |
| `courses` | Parsed from COR/schedule photos: code, section, days, time, room, modality, instructor |
| `xp_events` | Log of every point-earning action; used to compute level |
| `streaks` | Current and longest streak per habit or category |
| `integrations` | Per-user tokens: Google Calendar, Telegram chat ID, email address |
| `chat_messages` | Unified AI conversation history (user-keyed, not channel-keyed) |

---

## 6. UI Navigation

| Tab | Game Label | Purpose |
|---|---|---|
| 1 | **Home** | Daily landing: today's tasks, XP bar, streaks, quick-capture box |
| 2 | **Quests** | Full task/deadline view; filterable by School / Personal / All |
| 3 | **Habits** | Recurring habits; per-habit streak counter + heatmap |
| 4 | **Goals** | Long-term targets with progress rolled up from linked tasks/habits |
| 5 | **Schedule** | Weekly timetable from COR photo; PNG export; Calendar sync status |
| 6 | **Haia (chat)** | Unified AI chat thread (same as Telegram) |

Profile menu (bottom of sidebar): **Character Sheet**, **Appearance**, **Settings & Integrations**.

---

## 7. Recommended Build Order

Follow this sequence — later steps assume earlier ones are stable:

1. Supabase schema + authentication
2. FastAPI parsing endpoint (text → structured task) via Gemini
3. Telegram bot wired to that endpoint
4. Web dashboard reading from Supabase
5. Photo-to-task, voice note parsing, bulk syllabus import
6. Google Calendar sync for deadlines and classes
7. Schedule/COR photo → PNG renderer + calendar sync
8. Email-to-task pipeline (Mailgun/Postmark)
9. Background worker: streak resets + deadline reminders

---

## 8. Testing Checklist (Per Feature)

Before any feature is considered done:
- [ ] Unit tests for all parsing functions, gamification rules, and data transformations
- [ ] Integration tests hit a test Supabase instance (never prod)
- [ ] All external services (Gemini, Google Calendar, Telegram, Mailgun) are mocked in tests
- [ ] Both success and failure paths are tested for every external call
- [ ] Frontend: component tests for logic-heavy components; at least one E2E per main tab
- [ ] Full test suite passes (not just new tests)
- [ ] Manually walked through the feature in the actual UI or Telegram bot

---

## 9. Build Progress Tracker

This section is the live record of what has been implemented. **Update it every time a feature is added, changed, or removed.** Mark each item with its status and date, and add notes on any deviations from the original plan.

### Status Key
| Symbol | Meaning |
|---|---|
| ⬜ | Not started |
| 🔄 | In progress |
| ✅ | Complete |
| ⚠️ | Partial / has known issues |
| ❌ | Blocked or abandoned |

---

### Phase 1 — Foundation

| # | Feature | Status | Date | Notes |
|---|---|---|---|---|
| 1.1 | Supabase project setup | ⬜ | — | — |
| 1.2 | Database schema + migrations | ✅ | 2026-07-27 | `supabase/migrations/001_initial_schema.sql` — all 15 tables, indexes, triggers, helper functions. Successfully applied to Supabase. |
| 1.3 | Row-Level Security on all tables | ✅ | 2026-07-27 | All tables have RLS enabled with per-table policies. Applied in 001_initial_schema.sql. |
| 1.4 | Supabase Auth integration | ✅ | 2026-07-27 | `handle_new_user` trigger in schema auto-creates `haia.users` on signup. Redirect URLs pending (set in Supabase dashboard). |
| 1.5 | `.env.example` with all required vars | ✅ | 2026-07-27 | Root `.env.example` covers all services. `web/.env.local.example` for Next.js public vars. |
| 1.6 | FastAPI project scaffold (`/api`) | ✅ | 2026-07-27 | Domain-based structure: tasks, habits, goals, courses, gamification, chat, parsing, integrations, subjects. Gemini client + versioned prompts. |
| 1.7 | Next.js project scaffold (`/web`) | ✅ | 2026-07-27 | App Router, TypeScript, ESLint. Supabase SSR client (browser + server). Typed API client. |

---

### Phase 2 — Core Parsing & Bot

| # | Feature | Status | Date | Notes |
|---|---|---|---|---|
| 2.1 | Gemini client wrapper (`gemini_client.py`) | ⬜ | — | — |
| 2.2 | Text → structured task parsing endpoint | ⬜ | — | Pydantic validation on Gemini output |
| 2.3 | Telegram bot setup + webhook | ⬜ | — | — |
| 2.4 | Telegram → parsing endpoint wiring | ⬜ | — | — |
| 2.5 | Task saved to Supabase from bot input | ⬜ | — | — |

---

### Phase 3 — Web Dashboard

| # | Feature | Status | Date | Notes |
|---|---|---|---|---|
| 3.1 | Auth flow (login / signup) on web | ⬜ | — | — |
| 3.2 | Home tab — today's tasks, XP bar, streaks, quick-capture | ⬜ | — | — |
| 3.3 | Quests tab — full task list, filters (School / Personal / All) | ⬜ | — | — |
| 3.4 | Habits tab — recurring habits, streak counter, heatmap | ⬜ | — | — |
| 3.5 | Goals tab — long-term targets, linked task roll-up | ⬜ | — | — |
| 3.6 | Schedule tab — weekly timetable view, PNG export | ⬜ | — | — |
| 3.7 | Haia chat tab — in-app AI chat thread | ⬜ | — | — |
| 3.8 | Character Sheet — level, XP history, badges | ⬜ | — | — |
| 3.9 | Settings & Integrations — Telegram link, Calendar, email address | ⬜ | — | — |

---

### Phase 4 — AI-Powered Input Modes

| # | Feature | Status | Date | Notes |
|---|---|---|---|---|
| 4.1 | Photo-to-task (whiteboard, assignment sheet) | ⬜ | — | Reuses parsing endpoint |
| 4.2 | Voice note parsing (Telegram voice → text → task) | ⬜ | — | Single Gemini call |
| 4.3 | Bulk syllabus import (PDF/doc → all deadlines) | ⬜ | — | Uses Gemini long context |
| 4.4 | COR / schedule photo → structured course data | ⬜ | — | code, section, days, time, room, modality, instructor |
| 4.5 | Schedule → PNG renderer (Playwright) | ⬜ | — | HTML template → styled weekly-grid PNG |

---

### Phase 5 — Calendar & Email

| # | Feature | Status | Date | Notes |
|---|---|---|---|---|
| 5.1 | Google Calendar OAuth setup | ⬜ | — | — |
| 5.2 | Deadline → Calendar event creation | ⬜ | — | — |
| 5.3 | Course → recurring Calendar events | ⬜ | — | Meet link auto-attached for online modality |
| 5.4 | Mailgun/Postmark inbound webhook | ⬜ | — | — |
| 5.5 | Email body + attachments → task parsing | ⬜ | — | Same Gemini parsing pipeline |

---

### Phase 6 — Gamification

| # | Feature | Status | Date | Notes |
|---|---|---|---|---|
| 6.1 | XP calculation rules (`gamification.py`) | ⬜ | — | Harder/bigger items worth more |
| 6.2 | XP awarded on task/habit completion | ⬜ | — | Logged to `xp_events` |
| 6.3 | Level calculation from total XP | ⬜ | — | — |
| 6.4 | Streak tracking per habit | ⬜ | — | — |
| 6.5 | Streak reset background job | ⬜ | — | pg_cron or APScheduler |
| 6.6 | Semantic goal matching (Gemini embeddings) | ⬜ | — | New tasks suggested against existing goals |

---

### Phase 7 — Unified AI Chatbot

| # | Feature | Status | Date | Notes |
|---|---|---|---|---|
| 7.1 | Intent router (new item vs. conversational question) | ⬜ | — | Both channels hit the same endpoint |
| 7.2 | Conversational replies grounded in live Supabase snapshot | ⬜ | — | tasks, goals, streaks, XP pulled per request |
| 7.3 | Shared chat history across Telegram and web | ⬜ | — | `chat_messages` keyed to user, not channel |

---

### Phase 8 — Background Jobs & Notifications

| # | Feature | Status | Date | Notes |
|---|---|---|---|---|
| 8.1 | Daily digest generation | ⬜ | — | — |
| 8.2 | Deadline reminder notifications | ⬜ | — | Via Telegram |
| 8.3 | Streak reset cron job | ⬜ | — | — |

---

### Phase 9 — Polish & Monitoring

| # | Feature | Status | Date | Notes |
|---|---|---|---|---|
| 9.1 | Sentry integration (FastAPI + Next.js) | ⬜ | — | Optional but recommended |
| 9.2 | Appearance / theme customization | ⬜ | — | Predefined color themes |
| 9.3 | Badges / achievements system | ⬜ | — | — |
| 9.4 | Responsive / mobile-friendly web UI | ⬜ | — | — |

---

## 10. Known Issues & Deviations

> Record any bugs, technical debt, or intentional deviations from the plan here. Include the date and a short description. Remove items once they are resolved and covered by the tracker above.

| Date | Issue / Deviation | Status |
|---|---|---|
| — | *No issues logged yet* | — |

---

## 11. Environment Variables Reference

All variables below must be in `.env` (never committed). Keep `.env.example` updated.

| Variable | Service | Notes |
|---|---|---|
| `SUPABASE_URL` | Supabase | Project URL |
| `SUPABASE_ANON_KEY` | Supabase | Browser-safe; used in Next.js client |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | Backend-only; never in client bundle |
| `GEMINI_API_KEY` | Gemini API | From AI Studio |
| `TELEGRAM_BOT_TOKEN` | Telegram | From @BotFather |
| `GOOGLE_CLIENT_ID` | Google OAuth | For Calendar API |
| `GOOGLE_CLIENT_SECRET` | Google OAuth | For Calendar API |
| `MAILGUN_API_KEY` | Mailgun | Or Postmark equivalent |
| `MAILGUN_DOMAIN` | Mailgun | Verified subdomain for inbound parse |
| `SENTRY_DSN_API` | Sentry | FastAPI project DSN |
| `SENTRY_DSN_WEB` | Sentry | Next.js project DSN |

---

*Last updated: 2026-07-27 — Phase 1 complete. All 7 foundation items done: DB schema applied to Supabase, RLS active, Auth trigger live, `.env.example` created, FastAPI scaffold up (`/api` with all domain stubs, Gemini client, versioned prompts), Next.js scaffold up (`/web` with App Router, TypeScript, Supabase SSR client, typed API client). Ready for Phase 2: Gemini text parsing endpoint.*
