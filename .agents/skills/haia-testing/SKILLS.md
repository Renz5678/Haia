---
name: haia-testing
description: Use this skill whenever writing tests for Haia, deciding what needs test coverage before a feature is "done," setting up mocks for external services, or reviewing whether a change is adequately tested. Trigger on test, testing, pytest, Playwright, mock, coverage, unit test, integration test, or "is this done." Testing is not optional for any Haia feature — consult this skill before marking any feature complete, not just when explicitly asked to write tests. Read haia-architect first for what's being built.
---

# Haia Testing

Testing is not an afterthought for any feature in Haia — every feature ships with tests before it's considered done. This applies to backend (pytest) and frontend (Playwright/component tests) alike.

## Mocking — always, no exceptions

**Mock every external service in tests. Tests never make live calls to paid or rate-limited APIs.** This means, at minimum:

- **Gemini** — mock all parsing/classification/embedding calls.
- **Telegram** — mock bot API calls (sending messages, receiving updates).
- **Google Calendar** — mock event creation, OAuth token refresh.
- **Mailgun / Postmark** — mock inbound webhook payloads and any outbound calls.
- **Supabase** in unit tests — unit-test business logic (parsing functions, gamification rules, data transforms) independent of any live database; use a test Supabase instance or local Postgres only for integration tests, never production.

## Required coverage per feature

Every new feature needs:

- **Happy path** — the expected, well-formed input produces the expected result.
- **Failure path** — at least one realistic external failure (Gemini returns malformed JSON, Google Calendar auth has expired, Telegram delivery fails, Supabase call times out) is handled the way `haia-backend`'s error-handling rules require, not left to throw unhandled.
- **Edge cases** relevant to that feature (see the cross-cutting list below for the ones that repeatedly matter in this app).

## Backend (FastAPI / pytest)

- **Unit tests** for every parsing function, gamification rule (XP calculation, streak logic, leveling), and data transformation — these should be testable with no live external API and ideally no live database.
- **Integration tests** per endpoint, hitting a test Supabase instance or local Postgres — never the production database.
- Test both success and failure paths for every external call, per feature.

## Frontend (Next.js)

- **Component tests** for anything with logic — XP bar calculation, streak heatmap rendering, Quests filter logic. Don't skip these because "it's just UI"; if there's a calculation or a conditional, it needs a test.
- **At least one end-to-end test per main tab** (Home, Quests, Habits, Goals, Schedule, Haia chat) covering the primary user action on that screen — e.g. completing a quest and seeing XP update, logging a habit and seeing the streak/heatmap update.

## Cross-cutting scenarios worth explicit coverage

These matter more than they might look because they cut across Haia's channel-agnostic and gamified design:

- **Channel parity** — a task logged via Telegram appears correctly on the web dashboard and vice versa; a chat conversation started on one channel continues correctly on the other.
- **Gamification correctness** — XP totals, streak counts, and levels stay correct across edge cases: completing a habit twice in one day, missing a day then completing it late, deleting a completed task after XP was already awarded.
- **Calendar sync edge cases** — recurring class events, timezone handling, Meet link generation only for online modality (never for in-person), what happens when a course's schedule changes after the calendar event already exists.
- **Schedule/COR photo parsing** — blurry or partial photos, non-standard COR formats, multiple courses on one page.
- **Email-to-task** — emails with attachments, emails with no useful content, spoofed/irrelevant forwarded emails.
- **Goal roll-up** — a goal's progress recalculates correctly when a linked task or habit is completed, edited, or removed.

When building a feature that touches any of the above, write the corresponding edge case test even if it wasn't explicitly requested — these are the scenarios most likely to silently corrupt gamification state or break channel parity.

## Before calling any feature "done"

- [ ] New code has tests for the happy path and at least one realistic failure mode.
- [ ] Existing tests still pass — run the **full suite**, not just the new tests.
- [ ] Relevant cross-cutting scenarios above are covered if the feature touches them.
- [ ] Manually walked through the feature via the actual UI or Telegram bot at least once. Automated tests don't replace confirming the experience feels right — this app's whole premise is the gamified feel, and that can only be judged by actually using it (see `haia-product`).