---
name: haia-database
description: Use this skill whenever working on Haia's Supabase/Postgres schema — table design, relationships, naming, indexes, Row-Level Security policies, migrations, or Realtime configuration. Trigger on Supabase, schema, migration, table, RLS, foreign key, index, or database. Read haia-architect first for the overall data model; this skill covers schema-design rules and conventions in depth.
---

# Haia Database (Supabase / Postgres)

## Tables and what they own

| Table | Responsibility |
|---|---|
| `users` | Synced with Supabase Auth; profile info, timezone, semester dates |
| `subjects` | School subjects or life areas used to group tasks/habits/goals |
| `tasks` | One-off items and deadlines: type, status, due date, source (typed, Telegram, email, photo) |
| `habits` | Recurring personal habits, tracked separately from one-off tasks |
| `habit_logs` | Individual completions of a habit; used to compute streaks |
| `goals` | Longer-term targets that tasks and habits roll up into |
| `courses` | Parsed from COR/schedule photos: code, section, days, time, room, modality, instructor |
| `xp_events` | Log of every point-earning action; used to compute level |
| `streaks` | Current and longest streak per habit or category |
| `integrations` | Per-user tokens/settings: Google Calendar, Telegram chat id |
| `chat_messages` | Unified AI conversation history, keyed to user (not channel) |

Table responsibilities above should stay stable as the source of truth for what lives where — exact columns will evolve, but don't invent a new table for something that already has an owner (e.g. don't create a second "reminders" table when a reminder is really a `tasks` row plus a scheduling job).

## Naming conventions

- Table names: **plural snake_case** (`tasks`, `habit_logs`).
- Column names: **snake_case**.
- Foreign keys: `<referenced_table_singular>_id` (e.g. `goal_id`, `habit_id`).

## Row-Level Security — non-negotiable

- **RLS enabled on every table containing user data.** No table is readable/writable across users by default.
- Write explicit per-table policies rather than relying on a single blanket policy that might not cover every access pattern the app actually uses (select/insert/update/delete each need consideration).
- The backend's service-role key bypasses RLS — that's expected for server-side logic, but application code must still filter by user id explicitly (see `haia-backend`). RLS is the safety net for anything that could ever be queried with the anon key, not a replacement for correct query logic.

## Indexes

- Index every foreign key column — joins and cascading lookups (e.g. all tasks for a goal, all logs for a habit) depend on this.
- Index columns used in common dashboard queries (e.g. `tasks.due_date`, `tasks.status`, `xp_events.user_id` + timestamp) since Home and Quests views filter/sort on these constantly.

## Foreign keys and cascade behavior

Decide cascade behavior **explicitly** for every relationship — don't leave it as an accident of default behavior:

- Example: deleting a `goals` row — should linked `tasks` be orphaned (goal_id set null) or also removed? Pick one deliberately and encode it in the migration (`ON DELETE SET NULL` vs `ON DELETE CASCADE`), and note the reasoning in the migration file or `agents.md`.
- Apply the same discipline to `habits` → `habit_logs`, `habits`/`goals` → `streaks`, etc.

## Migrations

- **All schema changes go through migration files** committed to `supabase/migrations/`.
- **Never hand-edit the production schema through the Supabase dashboard** without a matching migration file in the repo — the dashboard and the repo must never diverge.
- Migrations should be additive/reviewable, not destructive edits to a single "current schema" file, so history stays bisectable.

## Realtime

- Tables that power live dashboard updates (tasks, xp_events, streaks at minimum) should have Realtime enabled so the web dashboard reflects changes made via Telegram or the AI chat without a manual refresh. This is what makes "channel parity" (see `haia-testing`) feel seamless rather than requiring a page reload.

## Triggers and helper functions

- Prefer a small number of well-named, well-documented Postgres functions/triggers for cross-cutting concerns that must be atomic and consistent (e.g. an XP-sync trigger when an `xp_events` row is inserted, an `xp_to_level` function, a streak-upsert helper, an `updated_at` trigger applied consistently across tables, and a `handle_new_user` trigger that creates the `users` row on Supabase Auth signup).
- Keep this logic in the migration files (versioned, reviewable) rather than duplicating the same calculation in application code and the database — pick one source of truth per calculation and have the other side call into or trust it.

## Auth

- `users` table is synced with Supabase Auth via a trigger on signup (`handle_new_user`), not manually created by application code after the fact.

## Environments

- Local, staging, and prod should use **separate Supabase projects** where feasible, so testing never touches real user data. Migrations run against all environments identically via the committed migration files — never a manual one-off change to just one environment.