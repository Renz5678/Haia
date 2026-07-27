---
name: haia-backend
description: Use this skill whenever writing or modifying Haia's FastAPI backend — routers, services, Pydantic schemas, Supabase calls from Python, Gemini API calls, business logic, or migrations invoked from the API. Trigger on FastAPI, API, endpoint, backend, Python, router, service layer, Pydantic, or webhook. Read haia-architect first for overall structure; this skill covers backend-specific implementation rules only.
---

# Haia Backend (FastAPI)

Covers everything under `/api`. Assumes `haia-architect` has already been read for overall project structure and the tech-stack contract.

## Structure

Organize by **domain**, not technical layer:

```
api/
├── tasks/
│   ├── router.py     # thin HTTP layer only
│   ├── service.py     # business logic lives here
│   └── schemas.py     # Pydantic models
├── habits/
├── goals/
├── gamification/
├── gemini_client.py
└── ...
```

Never dump everything into a generic `utils.py`. Module names describe the domain they own (`tasks.py`, `gamification.py`, `gemini_client.py`).

## Layering rules

- **Routers stay thin.** Parse/validate the request, call a service function, return the response. No business logic in a router.
- **Business logic belongs in `service.py`.** XP math, streak math, parsing orchestration, goal roll-up — all in the service layer, independently testable without spinning up FastAPI.
- **Schemas (`schemas.py`) define the contract.** Pydantic models for both request/response bodies and for validating any AI-generated structured output before it touches the database.

## Naming conventions

- `snake_case` for functions/variables.
- `PascalCase` for classes and Pydantic models.
- API routes: RESTful, plural nouns, versioned if breaking changes expected (`/api/v1/tasks`).

## The golden rule: never trust raw model output

Every Gemini call that produces structured data (tasks, courses, parsed emails, etc.) **must** be validated against a Pydantic schema before it touches Supabase. Never write directly to the database from a raw Gemini response.

- Define a Pydantic model for the expected shape.
- Parse Gemini's output into it; let validation errors surface as validation failures, not silent corruption.
- If validation fails or confidence is low, **do not drop the message and do not guess** — fall back to saving it as a raw/unparsed item the user can fix manually. See `haia-ai` for the confidence/fallback pattern in detail.

## Channel-agnostic endpoints

Telegram and the web dashboard must hit the **same** FastAPI endpoints and the same service functions. Do not fork logic per input channel — if you find yourself writing `if source == "telegram"` branching inside a service function, that's a signal the endpoint boundary is wrong, not a reason to add the branch.

## Error handling

Every external call — Gemini, Google Calendar, Telegram, Supabase, Mailgun/Postmark — must handle failure explicitly:

- Timeouts and rate limits are expected, not exceptional; handle them with retry/backoff or a clear fallback, not a bare `except: pass`.
- Malformed responses (bad JSON from Gemini, expired OAuth token from Calendar, failed Telegram delivery) must be caught and turned into a defined behavior, never an unhandled exception that crashes the request.
- **User-facing errors must be in-tone**, matching the app's ninja-battle-cry energy — e.g. "Couldn't quite parse that — try rephrasing?" — never a raw stack trace or a generic "Error 500."
- Log enough to debug (user id, endpoint, which external call failed) without logging secrets or full message content unnecessarily.

## RLS awareness from the backend

- The backend uses the Supabase **service-role key**, which bypasses RLS — this is powerful and dangerous. Always filter queries explicitly by the authenticated user's id in service-layer code; don't rely on RLS as a backstop when using the service-role key server-side.
- Service-role keys are backend-only. Never let one leak into a response payload, log line, or anything that could reach the Next.js client bundle.
- Any endpoint the browser calls directly (if ever bypassing the FastAPI layer) must use the anon key + RLS instead.

## Migrations

- Schema changes go through Supabase migration files committed to `supabase/migrations/`.
- Never hand-edit the production schema via the Supabase dashboard without a matching migration file in the repo.
- See `haia-database` for schema-design rules; this skill only covers how the backend interacts with migrations (i.e., don't let application code assume a column exists that isn't in a committed migration).

## Prompt management

Prompts used in Gemini calls (text parsing, photo parsing, voice, syllabus, schedule/COR) live in versioned, reviewable files — not inline strings scattered through service functions. This keeps prompt changes diffable like code. See `haia-ai` for prompt-specific conventions.

## Secrets

All credentials are environment variables, never hardcoded literals. `.env.example` lists every required variable with a placeholder and must be kept current whenever a new integration is added. Local/staging/prod use separate Supabase projects, Telegram bots, and Gemini keys where feasible so testing never touches real data.

## Before calling a backend feature done

- Unit tests for every parsing function, gamification rule, and data transformation, independent of live external APIs.
- Integration tests against a test Supabase instance/local Postgres — never prod.
- All external services mocked in tests.
- Both success and failure paths tested for every external call.
- See `haia-testing` for the full checklist.