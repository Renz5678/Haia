---
name: haia-architect
description: Use this skill whenever making architectural decisions on Haia, planning a new feature, refactoring existing code, deciding where something should live, or evaluating whether a proposed change fits the project's conventions. This is the "brain" skill — read it before haia-backend, haia-frontend, haia-ai, haia-database, or haia-testing, since it defines the rules those skills operate inside of. Trigger on words like architecture, new feature, refactor, project structure, build order, project planning, "where should this go," or "should I add a new library/service." Always consult this before proposing a structural or cross-cutting change.
---

# Haia Architect

Haia is a personal life-and-school management system that turns tasks, deadlines, habits, and goals into an RPG-style progress loop (points, streaks, levels) instead of a plain checklist. Input comes from a web dashboard or a private Telegram bot; a Gemini parsing layer turns casual text/photos/voice/documents into structured items; everything lives in Supabase; things with a schedule can sync to Google Calendar.

**Authoritative source of truth:** `CONTEXT.md` (project decisions) and `agents.md` (live build tracker) in the repo root. If anything in this skill conflicts with those files, the files win — flag the conflict rather than silently resolving it. If you make an architectural decision, a new integration, or change the data model, update the relevant section of those files in the same session. Do not let them drift from the codebase.

## Core loop (keep this in mind for every feature)

1. User mentions something (typed on web, or texted to the private Telegram bot).
2. Gemini classifies/parses it into a task, deadline, habit, or personal log — no forms.
3. It's saved to Supabase and shows up on the dashboard, grouped by subject/life area.
4. If it has a schedule (class, deadline, meeting), it can also land on Google Calendar, with a Meet link if online.
5. Completing things earns XP, builds streaks, and levels the user up.

Every new feature should fit into this loop or the six-tab surface below — don't bolt on a parallel system.

## Tech stack — the contract

| Layer | Technology |
|---|---|
| Frontend | Next.js + React (TypeScript) |
| Backend | FastAPI (Python) |
| Database / Auth | Supabase (Postgres + RLS) |
| AI parsing | Gemini API (Flash / Flash-Lite) |
| Bot interface | Telegram Bot API |
| Calendar | Google Calendar API |
| Email intake | Mailgun / Postmark inbound parse |
| Background jobs | Supabase `pg_cron` or APScheduler |
| Schedule PNG renderer | Playwright (headless) |
| Hosting | Vercel (web), Railway/Fly.io (api), Supabase Cloud (db) |
| Monitoring | Sentry (optional, recommended) |

**Do not introduce a different stack for a piece of functionality without flagging it first.** No swapping the DB, the AI provider, or the job scheduler without a discussion — this table is the contract, not a suggestion.

## Project structure

```
/
├── web/                        # Next.js frontend — own package.json + README
├── api/                        # FastAPI backend — own requirements + README
│   ├── tasks/                  # router.py, service.py, schemas.py
│   ├── habits/
│   ├── goals/
│   ├── gamification/
│   ├── gemini_client.py
│   └── ...
├── supabase/
│   └── migrations/
├── CONTEXT.md
├── agents.md
└── .env.example
```

Backend is organized **by domain**, not by technical layer — `tasks/router.py`, `tasks/service.py`, `tasks/schemas.py` live together. Frontend: one component per file, filename matches component name.

## Domain boundaries — who owns what

| Domain | Skill | Owns |
|---|---|---|
| Architecture, structure, build order, standards | **haia-architect** (this one) | Cross-cutting decisions |
| API, routers, services, schemas, Python | **haia-backend** | FastAPI code |
| Dashboard, components, UX copy | **haia-frontend** | Next.js/React code |
| Prompts, parsing, embeddings, intent routing | **haia-ai** | Gemini integration |
| Schema, migrations, RLS, indexes | **haia-database** | Supabase/Postgres |
| Unit/integration/E2E, mocking | **haia-testing** | Test coverage |
| Gamification feel, tone, UX philosophy | **haia-product** | Product/UX decisions |

When a task spans domains (it usually does), pull in the relevant skill(s) alongside this one rather than trying to hold all the rules in your head from this file.

## Product surface (6 tabs)

1. **Home** — today's tasks/deadlines, streaks, XP bar, quick-capture box.
2. **Quests** (not "Tasks") — full task/deadline view, filterable School/Personal/All, shows XP value + source.
3. **Habits** — recurring habits, own streak counter, consistency heatmap.
4. **Goals** — long-term targets fed by linked tasks/habits.
5. **Schedule** — weekly timetable from COR/schedule photos, PNG export, Calendar sync status.
6. **Haia (chat)** — the same AI assistant available via Telegram, persistent history.

Profile menu: Character Sheet, Appearance, Settings & Integrations.

Code-level naming (variables, tables, routes) does NOT need to mirror playful UI labels — but UI-facing strings always use the game framing (see haia-product / haia-frontend for terminology rules).

## Recommended build order — don't skip ahead without reason

1. Supabase schema + auth
2. FastAPI parsing endpoint (text → structured task) via Gemini
3. Telegram bot wired to that endpoint
4. Web dashboard reading from Supabase
5. Photo-to-task, voice note parsing, bulk syllabus import (reuse the parsing endpoint)
6. Google Calendar sync for deadlines/classes
7. Schedule/COR photo → PNG renderer + calendar sync
8. Email-to-task pipeline
9. Background worker (streak resets, reminders) — depends on everything above

Later steps assume earlier ones are stable. If asked to build something out of order, flag it and confirm the person actually wants to skip ahead.

## Project-wide principles

- **Clarity over cleverness.** Solo-maintained project — code should be readable by a tired future-you.
- **No dead code in commits.** Delete, don't comment out; git history preserves it.
- **Don't add a dependency the existing stack already solves.** Check the stack table first.
- **If a shortcut is necessary, flag it** with `# TODO(shortcut): ...` and in the commit/PR description rather than silently deviating from the architecture.
- **All input channels route to the same backend logic.** No forked logic per channel (Telegram vs. web).
- **Every external call handles failure explicitly** — see haia-backend for specifics.
- **Secrets are always env vars**, never hardcoded literals; `.env.example` stays current.

## Git & commit etiquette

- Small, focused commits — one logical change per commit.
- Imperative mood, ≤72-char summary line, blank line, then detail if needed (`Add streak calculation for daily habits`, not `fixed stuff`).
- Branches: `feature/<short-name>`, `fix/<short-name>`, `chore/<short-name>`.
- No committing straight to `main` beyond trivial fixes — branch + PR even solo.
- `.gitignore` covers `.env`, `node_modules`, `__pycache__`, build artifacts, generated schedule PNGs/temp files.

## When planning a new feature

1. Check which phase of the build order it belongs to and whether prerequisites are done (consult `agents.md`'s progress tracker).
2. Identify which domain skill(s) it touches (backend/frontend/ai/database/testing) and read those before writing code.
3. Confirm it fits the data model in haia-database rather than inventing new storage.
4. Confirm UI-facing language follows haia-product's terminology rules.
5. Plan test coverage per haia-testing before calling it done.
6. Update `agents.md`'s progress tracker (status, date, notes) and `CONTEXT.md` if any decision changed.

## When refactoring

- Preserve domain boundaries (don't merge `tasks/` and `habits/` logic just because it's convenient today).
- Check `agents.md` §10 (Known Issues & Deviations) for context on why something is the way it is before "fixing" it.
- If the refactor changes an architectural decision, update `CONTEXT.md` in the same session.

## Living document reminder

If you notice `CONTEXT.md` or `agents.md` is out of date relative to the actual codebase, flag the discrepancy to the user rather than silently working around it or silently trusting the stale doc.