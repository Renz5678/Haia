# Haia — AI Coding Agent Context Document

> **Purpose of this file:** This is the single source of truth for any AI coding agent (Claude Code, Cursor, Copilot, etc.) working on Haia. Read this in full before writing or modifying code. If a decision here conflicts with a request in a conversation, treat this document as authoritative unless the person explicitly says they're changing a decision — and if they do, this file should be updated in the same session.

---

## 1. What Haia Is

Haia is a personal life-and-school management system that turns everyday tasks, deadlines, and goals into something closer to a game than a chore list. Every completed task, habit, or goal earns progress — points, streaks, levels — the same way quests work in a game. It covers school and personal life in one place instead of splitting them across separate apps.

**Core loop:**
1. The person mentions something they need to do — typed into the web dashboard, or texted casually to a private Telegram bot only they can talk to.
2. An AI parsing layer (Gemini) figures out what kind of item it is (task, deadline, habit, or personal log) and files it correctly. No forms.
3. It shows up on the dashboard, organized by subject or life area, alongside progress, points, and streaks.
4. If it involves a schedule (class, deadline, online meeting), it can also land on Google Calendar automatically, with a Meet link attached if the class is online.
5. Completing things earns points, builds streaks, and levels the person up.

**Naming note:** "Haia" is meant to land like a shout — ninja battle-cry energy. It reflects the app's premise: momentum and a bit of adrenaline instead of a quiet, guilt-inducing checklist. Keep this tone in mind for UI copy, notification text, and naming of in-app concepts (e.g. "Quests" not "Tasks list").

---

## 2. Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js + React | Web dashboard: subjects, tasks, habits, goals, XP/streaks view |
| Backend | FastAPI (Python) | Core API, business logic, gamification rules, AI orchestration |
| Database / Auth | Supabase (Postgres) | Data storage, authentication, row-level security, realtime updates, file storage |
| AI parsing | Gemini API (Flash / Flash-Lite) | Natural language, photo, voice, and document parsing into structured data |
| Bot interface | Telegram Bot API | Primary casual-input channel; also used for reminders and notifications |
| Calendar | Google Calendar API | Auto-created deadlines/classes, recurring events, Meet link generation |
| Email intake | Mailgun / Postmark inbound parse | Forwarding-address based email-to-task pipeline (no Gmail OAuth review needed) |
| Scheduling / jobs | Supabase pg_cron or APScheduler | Streak resets, deadline reminders, daily digest generation |
| Image rendering | Playwright (headless browser) | Renders the weekly schedule as a styled PNG from an HTML template |
| Hosting | Vercel / Railway / Supabase Cloud | Frontend, backend + worker, and database hosting respectively |
| Monitoring | Sentry (optional, recommended) | Error tracking across FastAPI and Next.js |

**Do not introduce a different stack for a piece of functionality without flagging it.** E.g. don't reach for a different DB, a different AI provider, or a different job scheduler than what's listed above without discussing it first — this table is the contract.

---

## 3. Features

### 3.1 Core features
- **Everything in one place** — school assignments, personal goals, habits, and one-off tasks all live together, filterable by School, Personal, or All.
- **Talk to it instead of typing into it** — the private Telegram bot lets the person jot things down like texting a friend; it auto-sorts and files what they send.
- **Progress, not just checkboxes** — completing things earns points and builds streaks; bigger/harder items are worth more; consistency is rewarded.
- **Goals bigger than single tasks** — targets like "maintain a target grade" or "finish a personal project by December," fed by day-to-day tasks.
- **Habits, not just tasks** — recurring personal habits (workouts, sleep, journaling) tracked separately from one-time tasks.
- **Calendar-aware** — deadlines and class schedules can auto-appear on Google Calendar, including auto-generated Meet links for online classes.

### 3.2 AI-powered features (Gemini API)
- **Natural language task parsing** — e.g. "readings for networking due Friday" → structured task (type, subject, due date), no manual form-filling.
- **Photo-to-task** — a photo of a whiteboard, assignment sheet, or handout → structured tasks via Gemini's image understanding.
- **Voice note parsing** — a Telegram voice message is transcribed and parsed by Gemini in a single call.
- **Bulk syllabus import** — an entire semester's syllabus (PDF/doc) dropped in at once; Gemini's long context window extracts every deadline in one pass.
- **Semantic matching for goals** — Gemini embeddings compare new tasks against existing goals to suggest which goal a task contributes to (no hardcoded keyword rules).
- **Schedule / COR photo → visual schedule + calendar sync** — a photo of a class schedule or Certificate of Registration is parsed into structured course data (code, section, days, time, room, modality, instructor), which is then used to (a) render a styled weekly-schedule PNG and (b) create recurring Google Calendar events, with Meet links auto-attached for online classes.

### 3.3 Unified AI chatbot (Telegram + in-app)
One context-aware assistant, not two separate bots. The Telegram bot is not just a parser, and in-app chat is not a smarter separate version — **both are front ends to the same backend logic**, so behavior and memory are identical regardless of channel.

- **Intent routing** — every incoming message from either channel is classified by Gemini as either (a) a new task/habit/goal to log, or (b) a conversational question/request.
- **Task/habit/goal pipeline** — messages classified as new items go through the same structured extraction/saving logic as elsewhere.
- **Conversational assistant** — messages like "how am I doing this week," "what should I prioritize today," "motivate me" are answered using a live snapshot of tasks, goals, streaks, and XP pulled from Supabase — grounded in actual current state, never generic.
- **Shared chat history** — conversation turns are stored per user, not per channel, so a conversation started on Telegram can continue seamlessly on the web, and vice versa.

### 3.4 Email-to-task
The person forwards a relevant email (e.g. a professor's announcement) to a dedicated Haia inbox address. An inbound email parsing service (Mailgun/Postmark) delivers the content to a FastAPI webhook, which passes body + attachments to Gemini for the same structured-task extraction used elsewhere. This avoids the heavier Gmail OAuth review process required for full inbox access.

---

## 4. Product Surface (Navigation)

### 4.1 Sidebar — 6 main tabs
1. **Home** — daily landing screen. Today's tasks/deadlines, current streaks, XP bar/level up top, and a quick-capture box (same casual input style as the Telegram bot). This tab should make opening the app feel good, not like checking a chore list.
2. **Quests** — full task/deadline view (renamed from "Tasks" to keep the game framing). Filterable by School, Personal, or All. Each item shows its XP value and source (typed, Telegram, email, photo). Completing something here is the main way XP is earned.
3. **Habits** — recurring personal habits (workouts, sleep, journaling), kept separate from one-off tasks. Each habit has its own streak counter and a visual consistency heatmap.
4. **Goals** — bigger, longer-term targets (e.g. maintain a grade, finish a project by December). Each goal shows progress fed by linked tasks/habits, so day-to-day effort visibly rolls up.
5. **Schedule** — weekly timetable built from course data extracted from COR/schedule photos. Supports week and day views, PNG export, and shows current Google Calendar sync status.
6. **Haia (chat)** — the full conversation thread with the AI assistant, same one available via Telegram. Persistent history plus a few quick-action prompts.

### 4.2 Profile menu (bottom of sidebar)
- **Character sheet** — level, XP growth over time, badges/achievements, lifetime stats (longest streak, total quests completed). The "look how far I've come" payoff screen.
- **Appearance** — predefined color themes; customization itself is a small reward in a gamified system.
- **Settings & integrations** — Telegram bot link, Google Calendar connection, personal email-forwarding address, semester dates, notification preferences.

**UI/UX implication for the coding agent:** naming in code (variables, table names, API routes) doesn't need to mirror the playful UI labels ("Quests"), but UI-facing strings should consistently use the game framing (Quests, Character sheet, XP, streaks, levels) rather than reverting to generic to-do-app language.

---

## 5. Data Model (Supabase / Postgres)

This is the working shape of the schema. Exact columns will evolve, but the table list and responsibilities below should stay stable as the source of truth for what lives where.

| Table | Purpose |
|---|---|
| `users` | Synced with Supabase Auth; profile info, timezone, semester dates |
| `subjects` | School subjects or life areas used to group tasks/habits/goals |
| `tasks` | One-off items and deadlines: type, status, due date, source (typed, Telegram, email, photo) |
| `habits` | Recurring personal habits; tracked separately from one-off tasks |
| `habit_logs` | Individual completions of a habit, used to compute streaks |
| `goals` | Bigger, longer-term targets that tasks and habits roll up into |
| `courses` | Parsed from COR/schedule photos: code, section, days, time, room, modality, instructor |
| `xp_events` | Log of every point-earning action, used to compute levels |
| `streaks` | Current and longest streak per habit or category |
| `integrations` | Per-user tokens and settings for Google Calendar, Telegram chat ID, etc. |
| `chat_messages` | Conversation history with the AI assistant, keyed to the user (not the channel), so Telegram and web share one thread |

**Rules for schema changes:**
- Use Supabase migrations (never hand-edit the prod schema through the dashboard without a matching migration file committed to the repo).
- Enforce Row-Level Security (RLS) on every table containing user data. No table should be readable/writable across users by default.
- Foreign keys should cascade sensibly (e.g. deleting a `goals` row should decide explicitly whether linked `tasks` are orphaned or also removed — don't leave this undefined).

---

## 6. System Flows

### 6.1 Core architecture
- Input channels: Next.js web app and Telegram bot both feed into the FastAPI backend.
- FastAPI backend: handles parsing requests, gamification logic (XP, streaks, levels), and scheduling logic.
- Gemini API: called by FastAPI to parse text, photos, voice notes, and documents into structured data.
- Google Calendar API: called by FastAPI to create deadline/class events, including Meet links for online classes.
- Supabase: stores all structured data, handles auth, pushes realtime updates to the dashboard.

### 6.2 Schedule photo → PNG + calendar flow
1. A photo of a schedule or COR is sent via Telegram or uploaded on the web.
2. Gemini's vision parsing extracts structured course data: code, section, days, time, room, modality, instructor.
3. That data branches two ways: a PNG schedule renderer builds a styled weekly-grid image (headless-browser render of an HTML template), and the Google Calendar API creates recurring weekly events, auto-attaching a Meet link when the course is online.

### 6.3 Unified AI chatbot flow
1. A message arrives from Telegram or in-app chat and hits the same FastAPI endpoint.
2. Gemini classifies it as a new task/habit/goal, or a conversational question/request.
3. If new item → existing task/habit/goal extraction pipeline → saved to Supabase.
4. If conversational → FastAPI pulls a live snapshot of tasks/goals/streaks/XP from Supabase, and Gemini generates a grounded reply using that context plus recent chat history.
5. Chat history is stored per user, not per channel.

### 6.4 Email-to-task flow
1. Person forwards an email to the dedicated Haia inbox address.
2. Mailgun/Postmark delivers the parsed email to a FastAPI webhook.
3. FastAPI passes body + attachments to Gemini for the same structured-task extraction used elsewhere.

---

## 7. Third-Party Integrations — Setup Reference

| Service | What it's for | How to get it |
|---|---|---|
| Supabase | Database, auth, storage, realtime | supabase.com → new project → copy project URL, anon key, service-role key from Project Settings > API |
| Gemini API | All AI parsing | aistudio.google.com → "Get API key" (free tier, no card) |
| Google Cloud Console | Calendar API + OAuth | console.cloud.google.com → new project → enable "Google Calendar API" → configure OAuth consent screen → create OAuth 2.0 Client ID |
| Telegram Bot | Chat input + notifications | Message @BotFather → `/newbot` → get bot token |
| Mailgun / Postmark | Inbound email parsing | Free tier signup → verify a subdomain (e.g. `parse.yourapp.app`) → inbound route → FastAPI webhook URL |
| Vercel | Next.js hosting | Connect GitHub repo, auto-deploy on push |
| Railway / Fly.io / Render | FastAPI + worker hosting | Connect GitHub repo, add env vars (Supabase keys, Gemini key, bot token), deploy |
| Sentry (optional) | Error monitoring | sentry.io → project per app (FastAPI, Next.js) → copy DSN into env vars |

**Secrets handling:** every credential above is an environment variable, never a hardcoded literal. See §9.4.

---

## 8. Recommended Build Order

1. Supabase schema + authentication (everything else depends on this).
2. FastAPI parsing endpoint (text → structured task) using Gemini.
3. Wire the Telegram bot to that endpoint.
4. Web dashboard reading from Supabase.
5. Photo-to-task, voice note parsing, bulk syllabus import (reuse the same parsing endpoint with different input types).
6. Google Calendar sync for deadlines and classes.
7. Schedule/COR photo feature (PNG renderer + calendar sync).
8. Email-to-task pipeline via Mailgun/Postmark.
9. Scheduler/background worker for streak resets and reminders (depends on everything above).

**Do not build out of this order without a reason.** Later steps assume earlier ones exist (e.g. the scheduler assumes streaks and tasks already exist and are stable).

---

## 9. Coding Standards & Etiquette

### 9.1 General principles
- Prefer clarity over cleverness. This is a solo-maintained project — code should be readable by a tired future-you, not just by whoever wrote it today.
- Every new feature should fit into the architecture in §6, not bypass it. If a shortcut seems necessary, flag it in a comment (`# TODO(shortcut): ...`) and in the PR/commit description rather than silently deviating.
- No dead code left in commits — delete instead of commenting out. Git history preserves it.
- Don't introduce a new library/dependency for something the existing stack already solves. Check §2 first.

### 9.2 Naming conventions
- **Python (FastAPI):** `snake_case` for functions/variables, `PascalCase` for classes and Pydantic models, modules named for the domain they own (`tasks.py`, `gamification.py`, `gemini_client.py`) not generic names (`utils.py` for everything).
- **TypeScript/React (Next.js):** `camelCase` for variables/functions, `PascalCase` for components, one component per file, filename matches component name.
- **Database:** table names plural snake_case (`tasks`, `habit_logs`), column names snake_case, foreign keys named `<referenced_table_singular>_id` (e.g. `goal_id`).
- **API routes:** RESTful, plural nouns, versioned if breaking changes are expected (`/api/v1/tasks`).

### 9.3 Project structure
- Keep frontend (Next.js) and backend (FastAPI) in clearly separate top-level directories (e.g. `/web` and `/api`), each with its own dependency manifest and its own README describing how to run it locally.
- Backend organized by domain, not by technical layer only — e.g. group `tasks/router.py`, `tasks/service.py`, `tasks/schemas.py` together rather than all routers in one folder and all schemas in another.
- Shared types between frontend/backend (e.g. task shape) should have one source of truth — either generate frontend types from backend Pydantic models, or keep a shared schema definition, rather than hand-duplicating types in both places.

### 9.4 Environment & secrets
- All API keys, tokens, and connection strings live in `.env` files, never committed. `.env.example` should list every required variable with a placeholder, kept up to date whenever a new integration is added.
- Different environments (local, staging, prod) use different Supabase projects / Telegram bots / Gemini keys where feasible, so testing never touches real data.
- Service-role Supabase keys are backend-only, never shipped to the Next.js client bundle. Anything exposed to the browser uses the anon key + RLS.

### 9.5 Git & commit etiquette
- Small, focused commits — one logical change per commit, not "various fixes."
- Commit messages: imperative mood, short summary line (≤72 chars), blank line, then detail if needed. E.g. `Add streak calculation for daily habits`, not `fixed stuff`.
- Branch naming: `feature/<short-name>`, `fix/<short-name>`, `chore/<short-name>`.
- No committing directly to `main` for anything beyond trivial fixes — use a branch + PR, even solo, so there's a review checkpoint and a clean history to bisect later.
- `.gitignore` covers `.env`, `node_modules`, `__pycache__`, build artifacts, and any generated PNGs/temp files from the schedule renderer.

### 9.6 Error handling
- Every external call (Gemini, Google Calendar, Telegram, Supabase, Mailgun/Postmark) must handle failure explicitly — timeouts, rate limits, malformed responses. Never let an unhandled exception from a third-party API crash a request silently.
- User-facing errors (in chat or dashboard) should be human and in-tone ("Couldn't quite parse that — try rephrasing?") rather than raw stack traces or generic "Error 500."
- Log enough context to debug (which user, which endpoint, which external call failed) without logging secrets or full message content unnecessarily.

### 9.7 AI-parsing-specific etiquette
- Every Gemini call that produces structured data (tasks, courses, etc.) should validate the output against a schema (Pydantic on the backend) before it touches the database. Never trust raw model output as pre-validated.
- Have a defined fallback when parsing confidence is low or the schema doesn't validate — e.g. save as a raw/unparsed item the person can fix manually, rather than silently dropping the message or guessing.
- Keep prompts for each parsing task (text, photo, voice, syllabus, schedule/COR) in versioned, reviewable files (not inline strings scattered through the codebase), so prompt changes are diffable like code.

---

## 10. Testing Requirements — Test Comprehensively

Testing is not optional or an afterthought for any of the flows below. Every feature in §3 should ship with tests before being considered done.

### 10.1 Backend (FastAPI)
- **Unit tests** for every parsing function, gamification rule (XP calculation, streak logic, leveling), and data transformation — independent of any live external API.
- **Integration tests** for each endpoint, hitting a test Supabase instance (or local Postgres) — never the production database.
- **Mock all external services in tests** — Gemini, Google Calendar, Telegram, Mailgun/Postmark. Tests should never make live calls to paid/rate-limited APIs.
- Test both success and failure paths for every external call: what happens when Gemini returns malformed JSON, when Google Calendar auth has expired, when Telegram delivery fails, when an inbound email has no parseable content.

### 10.2 Frontend (Next.js)
- Component tests for anything with logic (XP bar calculation, streak heatmap rendering, filter logic on Quests).
- At least one end-to-end test per main tab (Home, Quests, Habits, Goals, Schedule, Haia chat) covering the primary user action on that screen (e.g. completing a quest and seeing XP update).

### 10.3 Cross-cutting scenarios worth explicit test coverage
- **Channel parity:** a task logged via Telegram appears correctly on the web dashboard and vice versa; a chat conversation started on one channel continues correctly on the other.
- **Gamification correctness:** XP totals, streak counts, and levels stay correct across edge cases — completing a habit twice in a day, missing a day then completing it late, deleting a completed task after XP was awarded.
- **Calendar sync edge cases:** recurring class events, timezone handling, Meet link generation only for online modality, what happens when a course's schedule changes after the calendar event already exists.
- **Schedule/COR photo parsing:** blurry or partial photos, non-standard COR formats, multiple courses on one page.
- **Email-to-task:** emails with attachments, emails with no useful content, spoofed/irrelevant forwarded emails.
- **Goal roll-up:** a goal's progress recalculates correctly when a linked task or habit is completed, edited, or removed.

### 10.4 Before calling any feature "done"
- All new code has tests covering both the happy path and at least one realistic failure mode.
- Existing tests still pass (run the full suite, not just the new tests).
- Manually walk through the feature via the actual UI/Telegram bot at least once — automated tests don't replace confirming the experience feels right, given the gamified-UX intent of this project.

---

## 11. Living Document

This file should be updated whenever a decision here changes — new integration, changed data model, revised build order, new coding standard. Treat it as the reference to return to so the project doesn't drift from what's already been decided. If the coding agent notices this document is out of date relative to the actual codebase, it should flag the discrepancy rather than silently working around it.