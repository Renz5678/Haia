-- =============================================================================
-- Haia — Initial Database Schema
-- Migration: 001_initial_schema.sql
-- Run this in the Supabase SQL Editor (or via Supabase CLI migrations).
-- =============================================================================


-- =============================================================================
-- EXTENSIONS
-- =============================================================================

-- Vector similarity search — required for semantic goal matching (Gemini embeddings)
create extension if not exists vector with schema extensions;

-- Required for gen_random_uuid() on older Postgres versions (Supabase has this by default)
create extension if not exists "pgcrypto";


-- =============================================================================
-- SCHEMA
-- Keep all Haia tables in a dedicated schema for clarity.
-- =============================================================================

create schema if not exists haia;


-- =============================================================================
-- HELPER: updated_at trigger function
-- Automatically stamps updated_at on every UPDATE.
-- =============================================================================

create or replace function haia.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- =============================================================================
-- TABLE: users
-- Extends auth.users with Haia-specific profile data.
-- One row per authenticated user; id mirrors auth.users(id).
-- =============================================================================

create table haia.users (
  id              uuid        primary key references auth.users (id) on delete cascade,
  email           text        not null unique,
  display_name    text        not null,
  avatar_url      text,
  timezone        text        not null default 'Asia/Manila',

  -- Denormalised gamification fields (kept in sync by the gamification service)
  current_level   integer     not null default 1 check (current_level >= 1),
  total_xp        integer     not null default 0 check (total_xp >= 0),

  -- Appearance
  theme           text        not null default 'default',

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger users_updated_at
  before update on haia.users
  for each row execute function haia.set_updated_at();

create index idx_users_email on haia.users (email);


-- =============================================================================
-- TABLE: semesters
-- Academic terms. Scopes subjects and courses so historical data is preserved
-- when a new semester begins.
-- =============================================================================

create table haia.semesters (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references haia.users (id) on delete cascade,
  name        text        not null,           -- e.g. "2nd Sem AY 2025-2026"
  start_date  date        not null,
  end_date    date        not null,
  is_active   boolean     not null default true,

  created_at  timestamptz not null default now(),

  constraint semesters_dates_valid check (end_date > start_date)
);

create index idx_semesters_user_id     on haia.semesters (user_id);
create index idx_semesters_user_active on haia.semesters (user_id, is_active);


-- =============================================================================
-- TABLE: subjects
-- School subjects or personal life areas used to group tasks, habits, goals.
-- Personal subjects have semester_id = NULL.
-- =============================================================================

create table haia.subjects (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references haia.users (id) on delete cascade,
  semester_id  uuid        references haia.semesters (id) on delete set null,
  name         text        not null,
  color        text,                          -- hex color, e.g. "#7C3AED"
  icon         text,                          -- emoji or icon key
  area         text        not null default 'personal'
                           check (area in ('school', 'personal')),

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger subjects_updated_at
  before update on haia.subjects
  for each row execute function haia.set_updated_at();

create index idx_subjects_user_id      on haia.subjects (user_id);
create index idx_subjects_semester_id  on haia.subjects (semester_id);
create index idx_subjects_area         on haia.subjects (user_id, area);


-- =============================================================================
-- TABLE: goals
-- Long-term targets that tasks and habits roll up into.
-- Defined before tasks/habits so junction tables can reference it.
-- =============================================================================

create table haia.goals (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references haia.users (id) on delete cascade,
  subject_id      uuid        references haia.subjects (id) on delete set null,

  title           text        not null,
  description     text,

  goal_type       text        not null default 'custom'
                              check (goal_type in ('grade', 'project', 'habit_streak', 'custom')),

  -- For grade goals: target = 85.0, current = current grade estimate
  -- For project goals: target = 100 (%), current = % complete
  -- For habit_streak goals: target = 30 (days), current = current streak
  target_value    numeric,
  current_value   numeric     default 0,

  target_date     date,

  status          text        not null default 'active'
                              check (status in ('active', 'completed', 'paused', 'abandoned')),

  -- Gemini embedding for semantic task-to-goal matching
  -- text-embedding-004 outputs 768 dims; adjust if switching models
  embedding       extensions.vector(768),

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger goals_updated_at
  before update on haia.goals
  for each row execute function haia.set_updated_at();

create index idx_goals_user_id     on haia.goals (user_id);
create index idx_goals_subject_id  on haia.goals (subject_id);
create index idx_goals_status      on haia.goals (user_id, status);

-- IVFFlat index for fast cosine similarity search on embeddings.
-- Tune lists= based on row count (rule of thumb: sqrt(rows)).
create index idx_goals_embedding on haia.goals
  using ivfflat (embedding extensions.vector_cosine_ops)
  with (lists = 100);


-- =============================================================================
-- TABLE: courses
-- Parsed from COR / schedule photos. One row per course per semester.
-- =============================================================================

create table haia.courses (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references haia.users (id) on delete cascade,
  semester_id      uuid        references haia.semesters (id) on delete set null,
  subject_id       uuid        references haia.subjects (id) on delete set null,

  code             text        not null,      -- e.g. "CCNA 101"
  section          text,                       -- e.g. "A1"
  name             text,                       -- Full course name
  instructor       text,
  room             text,

  modality         text        not null default 'in_person'
                               check (modality in ('in_person', 'online', 'hybrid')),

  days             text[]      not null,       -- e.g. '{Mon,Wed,Fri}'
  start_time       time        not null,
  end_time         time        not null,
  units            numeric,

  -- Google Calendar integration
  calendar_event_id text,                      -- Recurring event ID
  meet_link         text,                      -- Auto-generated for online/hybrid modality

  -- Raw Gemini-parsed data stored for debugging / re-parsing
  raw_parsed_data  jsonb,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint courses_times_valid check (end_time > start_time)
);

create trigger courses_updated_at
  before update on haia.courses
  for each row execute function haia.set_updated_at();

create index idx_courses_user_id      on haia.courses (user_id);
create index idx_courses_semester_id  on haia.courses (semester_id);
create index idx_courses_subject_id   on haia.courses (subject_id);


-- =============================================================================
-- TABLE: tasks
-- One-off items and deadlines. Primary unit of work in the Quests tab.
-- =============================================================================

create table haia.tasks (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references haia.users (id) on delete cascade,
  subject_id       uuid        references haia.subjects (id) on delete set null,
  course_id        uuid        references haia.courses (id) on delete set null,

  title            text        not null,
  description      text,

  task_type        text        not null default 'task'
                               check (task_type in (
                                 'task', 'deadline', 'assignment', 'exam', 'project', 'quiz', 'lab'
                               )),

  status           text        not null default 'pending'
                               check (status in ('pending', 'in_progress', 'completed', 'cancelled')),

  priority         text        not null default 'medium'
                               check (priority in ('low', 'medium', 'high', 'critical')),

  due_date         timestamptz,
  completed_at     timestamptz,

  -- Gamification
  xp_value         integer     not null default 10 check (xp_value >= 0),

  -- Provenance — how the task entered the system
  source           text        not null default 'typed'
                               check (source in (
                                 'typed', 'telegram', 'email', 'photo', 'voice', 'syllabus', 'ai_suggestion'
                               )),
  raw_input        text,        -- Original unparsed message for audit / re-parsing

  -- Google Calendar integration
  calendar_event_id text,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger tasks_updated_at
  before update on haia.tasks
  for each row execute function haia.set_updated_at();

create index idx_tasks_user_id      on haia.tasks (user_id);
create index idx_tasks_subject_id   on haia.tasks (subject_id);
create index idx_tasks_course_id    on haia.tasks (course_id);
create index idx_tasks_status       on haia.tasks (user_id, status);
create index idx_tasks_due_date     on haia.tasks (user_id, due_date);
create index idx_tasks_source       on haia.tasks (user_id, source);


-- =============================================================================
-- TABLE: task_goals  [junction]
-- Many-to-many: a task can contribute to multiple goals.
-- Both sides cascade on delete — removing a task or goal cleans up the link.
-- =============================================================================

create table haia.task_goals (
  task_id     uuid        not null references haia.tasks (id) on delete cascade,
  goal_id     uuid        not null references haia.goals (id) on delete cascade,
  created_at  timestamptz not null default now(),

  primary key (task_id, goal_id)
);

create index idx_task_goals_goal_id on haia.task_goals (goal_id);


-- =============================================================================
-- TABLE: habits
-- Recurring personal habits tracked separately from one-off tasks.
-- =============================================================================

create table haia.habits (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references haia.users (id) on delete cascade,
  subject_id   uuid        references haia.subjects (id) on delete set null,

  name         text        not null,
  description  text,

  frequency    text        not null default 'daily'
                           check (frequency in ('daily', 'weekdays', 'weekends', 'custom')),

  -- Array of day-of-week integers: 0=Sun, 1=Mon, ..., 6=Sat
  -- Populated only when frequency = 'custom'
  custom_days  integer[],

  target_time  time,        -- Ideal time-of-day for reminder notifications

  xp_value     integer     not null default 5 check (xp_value >= 0),
  is_active    boolean     not null default true,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger habits_updated_at
  before update on haia.habits
  for each row execute function haia.set_updated_at();

create index idx_habits_user_id     on haia.habits (user_id);
create index idx_habits_subject_id  on haia.habits (subject_id);
create index idx_habits_active      on haia.habits (user_id, is_active);


-- =============================================================================
-- TABLE: habit_logs
-- Individual completions of a habit. Each row = one check-in.
-- Powers streak computation and the heatmap visualization.
-- =============================================================================

create table haia.habit_logs (
  id           uuid        primary key default gen_random_uuid(),
  habit_id     uuid        not null references haia.habits (id) on delete cascade,
  user_id      uuid        not null references haia.users (id) on delete cascade,

  -- The calendar date this completion counts for (not the timestamp it was logged)
  logged_date  date        not null,
  logged_at    timestamptz not null default now(),

  note         text,
  xp_awarded   integer     not null default 0,

  -- One log per habit per day enforced at DB level
  unique (habit_id, logged_date)
);

create index idx_habit_logs_habit_id     on haia.habit_logs (habit_id);
create index idx_habit_logs_user_id      on haia.habit_logs (user_id);
create index idx_habit_logs_logged_date  on haia.habit_logs (habit_id, logged_date desc);


-- =============================================================================
-- TABLE: habit_goals  [junction]
-- Many-to-many: a habit can contribute to multiple goals.
-- =============================================================================

create table haia.habit_goals (
  habit_id    uuid        not null references haia.habits (id) on delete cascade,
  goal_id     uuid        not null references haia.goals (id) on delete cascade,
  created_at  timestamptz not null default now(),

  primary key (habit_id, goal_id)
);

create index idx_habit_goals_goal_id on haia.habit_goals (goal_id);


-- =============================================================================
-- TABLE: xp_events
-- Immutable log of every XP-earning action.
-- Single source of truth for level and total XP.
-- Polymorphic source_type + source_id (not DB-enforced FK per CONTEXT.md §5).
-- =============================================================================

create table haia.xp_events (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references haia.users (id) on delete cascade,

  xp_amount    integer     not null,  -- Can be negative for corrections / reversals

  -- Polymorphic reference to the entity that triggered the XP
  source_type  text        not null
               check (source_type in (
                 'task', 'habit', 'habit_streak_bonus', 'achievement', 'level_up', 'manual'
               )),
  source_id    uuid,       -- Points to the relevant row; not DB-enforced (polymorphic)

  reason       text        not null,  -- Human-readable, e.g. "Completed quest: Module 7 readings"

  earned_at    timestamptz not null default now()
);

create index idx_xp_events_user_id    on haia.xp_events (user_id);
create index idx_xp_events_earned_at  on haia.xp_events (user_id, earned_at desc);
create index idx_xp_events_source     on haia.xp_events (source_type, source_id);


-- =============================================================================
-- TABLE: streaks
-- Tracks current and best streaks — per habit AND category-level.
--
-- streak_type = 'habit'    → habit_id is set; tracks a specific habit
-- streak_type = 'category' → category is set ('school' | 'personal')
--                            tracks ≥1 completion per day in that area
-- streak_type = 'overall'  → tracks any daily activity across the app
-- =============================================================================

create table haia.streaks (
  id                  uuid    primary key default gen_random_uuid(),
  user_id             uuid    not null references haia.users (id) on delete cascade,
  habit_id            uuid    references haia.habits (id) on delete cascade,

  streak_type         text    not null
                      check (streak_type in ('habit', 'category', 'overall')),

  -- Used when streak_type = 'category'
  category            text    check (category in ('school', 'personal')),

  current_streak      integer not null default 0 check (current_streak >= 0),
  longest_streak      integer not null default 0 check (longest_streak >= 0),

  last_activity_date  date,

  updated_at          timestamptz not null default now(),

  -- Logical consistency: habit streaks must have habit_id; category streaks must have category
  constraint streaks_type_consistency check (
    (streak_type = 'habit'    and habit_id is not null and category is null) or
    (streak_type = 'category' and category is not null and habit_id is null) or
    (streak_type = 'overall'  and habit_id is null     and category is null)
  )
);

create trigger streaks_updated_at
  before update on haia.streaks
  for each row execute function haia.set_updated_at();

create index idx_streaks_user_id   on haia.streaks (user_id);
create index idx_streaks_habit_id  on haia.streaks (habit_id);

-- Unique indexes per streak type (partial indexes are cleaner than constraints here)
create unique index idx_streaks_habit_unique
  on haia.streaks (user_id, habit_id)
  where habit_id is not null;

create unique index idx_streaks_category_unique
  on haia.streaks (user_id, category)
  where category is not null;

create unique index idx_streaks_overall_unique
  on haia.streaks (user_id)
  where streak_type = 'overall';


-- =============================================================================
-- TABLE: achievements
-- Badges / unlockable milestones. One row per user per achievement key.
-- Rows are inserted (with unlocked_at = NULL) as "pending" achievements
-- when a user signs up, then updated to set unlocked_at when triggered.
-- =============================================================================

create table haia.achievements (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references haia.users (id) on delete cascade,

  achievement_key text        not null,   -- e.g. 'streak_7_days'
  name            text        not null,   -- Display name shown on Character Sheet
  description     text        not null,   -- Flavor text
  icon            text,                   -- Emoji or asset key

  xp_reward       integer     not null default 0 check (xp_reward >= 0),

  -- NULL = not yet unlocked; set on unlock
  unlocked_at     timestamptz,

  created_at      timestamptz not null default now(),

  unique (user_id, achievement_key)
);

create index idx_achievements_user_id  on haia.achievements (user_id);
create index idx_achievements_unlocked on haia.achievements (user_id, unlocked_at);


-- =============================================================================
-- TABLE: integrations
-- Per-user credentials and settings for third-party services.
-- One row per service per user.
-- WARNING: store tokens encrypted via Supabase Vault in production.
-- =============================================================================

create table haia.integrations (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references haia.users (id) on delete cascade,

  service           text        not null
                    check (service in ('google_calendar', 'telegram', 'email')),

  -- OAuth tokens (use Supabase Vault or backend-side encryption — never expose to client)
  access_token      text,
  refresh_token     text,
  token_expires_at  timestamptz,

  -- Service-specific identifiers
  external_id       text,       -- Telegram chat_id or Google Calendar ID
  email_address     text,       -- Haia inbound forwarding address (email-to-task pipeline)

  -- Freeform service-specific config (e.g. notification time preferences per service)
  metadata          jsonb       default '{}'::jsonb,

  is_active         boolean     not null default true,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  unique (user_id, service)
);

create trigger integrations_updated_at
  before update on haia.integrations
  for each row execute function haia.set_updated_at();

create index idx_integrations_user_id  on haia.integrations (user_id);
-- Used by the backend to look up Telegram users by chat_id
create index idx_integrations_service  on haia.integrations (service, external_id);


-- =============================================================================
-- TABLE: chat_messages
-- Unified AI conversation history.
-- Keyed to the user — not the channel — so Telegram and web share one thread.
-- =============================================================================

create table haia.chat_messages (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references haia.users (id) on delete cascade,

  role             text        not null
                   check (role in ('user', 'assistant', 'system')),

  content          text        not null,

  -- Which surface the message came from — informational only, never splits the thread
  channel          text        not null default 'web'
                   check (channel in ('telegram', 'web')),

  -- Intent classification result from the Gemini router
  intent           text        check (intent in (
                     'new_task', 'new_habit', 'new_goal', 'conversational', 'unknown'
                   )),

  -- If this message created an item, record what and which row
  linked_item_type text        check (linked_item_type in ('task', 'habit', 'goal')),
  linked_item_id   uuid,       -- Polymorphic — not DB-enforced

  -- Token usage for monitoring / cost tracking
  prompt_tokens    integer,
  completion_tokens integer,

  created_at       timestamptz not null default now()
);

create index idx_chat_messages_user_id    on haia.chat_messages (user_id);
-- Dashboard loads the most recent N messages — DESC index matches the query
create index idx_chat_messages_created_at on haia.chat_messages (user_id, created_at desc);
create index idx_chat_messages_channel    on haia.chat_messages (user_id, channel);


-- =============================================================================
-- HELPER FUNCTION: xp_to_level
-- Triangular-number XP → level progression.
-- Adjust the divisor (50) to tune how fast users level up.
--
-- Breakpoints with divisor=50:
--   Lvl  1:     0 XP    Lvl  2:    50 XP    Lvl  3:   150 XP
--   Lvl  4:   300 XP    Lvl  5:   500 XP    Lvl 10:  2250 XP
--   Lvl 20:  9500 XP    Lvl 50: 61250 XP
-- =============================================================================

create or replace function haia.xp_to_level(p_total_xp integer)
returns integer
language sql
immutable
as $$
  select greatest(
    1,
    floor(
      (-1.0 + sqrt(1.0 + 8.0 * greatest(p_total_xp, 0)::float / 50.0)) / 2.0
    ) + 1
  )::integer;
$$;


-- =============================================================================
-- HELPER FUNCTION: sync_user_xp
-- Recomputes total_xp and current_level from xp_events and writes them back
-- to haia.users. Called via trigger after every xp_events insert.
-- =============================================================================

create or replace function haia.sync_user_xp(p_user_id uuid)
returns void
language plpgsql
as $$
declare
  v_total_xp integer;
  v_level    integer;
begin
  select coalesce(sum(xp_amount), 0)
    into v_total_xp
    from haia.xp_events
   where user_id = p_user_id;

  v_level := haia.xp_to_level(v_total_xp);

  update haia.users
     set total_xp      = v_total_xp,
         current_level = v_level
   where id = p_user_id;
end;
$$;


-- =============================================================================
-- TRIGGER: auto-sync XP denormalised columns after every xp_events insert
-- =============================================================================

create or replace function haia.after_xp_event()
returns trigger
language plpgsql
as $$
begin
  perform haia.sync_user_xp(new.user_id);
  return new;
end;
$$;

create trigger xp_events_sync_user
  after insert on haia.xp_events
  for each row execute function haia.after_xp_event();


-- =============================================================================
-- HELPER FUNCTION: upsert_streak
-- Called by the gamification service whenever a habit is logged or a task is
-- completed. Handles the consecutive-day / gap / same-day logic in one place.
--
-- Parameters:
--   p_user_id  — the user
--   p_habit_id — NULL for category/overall streaks
--   p_type     — 'habit' | 'category' | 'overall'
--   p_category — 'school' | 'personal' | NULL
--   p_date     — the date to credit (usually current_date in user's timezone)
-- =============================================================================

create or replace function haia.upsert_streak(
  p_user_id    uuid,
  p_habit_id   uuid    default null,
  p_type       text    default 'habit',
  p_category   text    default null,
  p_date       date    default current_date
)
returns haia.streaks
language plpgsql
as $$
declare
  v_streak haia.streaks;
begin
  -- Ensure a streak row exists for this combination
  insert into haia.streaks (user_id, habit_id, streak_type, category)
  values (p_user_id, p_habit_id, p_type, p_category)
  on conflict do nothing;

  -- Fetch the current state
  select * into v_streak
    from haia.streaks
   where user_id = p_user_id
     and streak_type = p_type
     and (habit_id    is not distinct from p_habit_id)
     and (category    is not distinct from p_category);

  if v_streak.last_activity_date is null
     or p_date - v_streak.last_activity_date = 1
  then
    -- Consecutive day: increment
    update haia.streaks
       set current_streak     = current_streak + 1,
           longest_streak     = greatest(longest_streak, current_streak + 1),
           last_activity_date = p_date
     where id = v_streak.id
    returning * into v_streak;

  elsif p_date = v_streak.last_activity_date then
    -- Same day: idempotent — no change
    null;

  else
    -- Gap detected: reset to 1
    update haia.streaks
       set current_streak     = 1,
           last_activity_date = p_date
     where id = v_streak.id
    returning * into v_streak;
  end if;

  return v_streak;
end;
$$;


-- =============================================================================
-- ROW-LEVEL SECURITY
-- RLS is enabled on every table. Default policy: deny all.
-- All access is restricted to the authenticated user's own rows.
-- Backend writes that span multiple users (e.g. streak resets) use the
-- service role key, which bypasses RLS by design.
-- =============================================================================

alter table haia.users           enable row level security;
alter table haia.semesters       enable row level security;
alter table haia.subjects        enable row level security;
alter table haia.goals           enable row level security;
alter table haia.courses         enable row level security;
alter table haia.tasks           enable row level security;
alter table haia.task_goals      enable row level security;
alter table haia.habits          enable row level security;
alter table haia.habit_logs      enable row level security;
alter table haia.habit_goals     enable row level security;
alter table haia.xp_events       enable row level security;
alter table haia.streaks         enable row level security;
alter table haia.achievements    enable row level security;
alter table haia.integrations    enable row level security;
alter table haia.chat_messages   enable row level security;


-- users
create policy "users: read own row"
  on haia.users for select
  using (id = auth.uid());

create policy "users: update own row"
  on haia.users for update
  using (id = auth.uid());

create policy "users: insert own row"
  on haia.users for insert
  with check (id = auth.uid());

-- semesters
create policy "semesters: all own rows"
  on haia.semesters for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- subjects
create policy "subjects: all own rows"
  on haia.subjects for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- goals
create policy "goals: all own rows"
  on haia.goals for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- courses
create policy "courses: all own rows"
  on haia.courses for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- tasks
create policy "tasks: all own rows"
  on haia.tasks for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- task_goals (junction) — verify ownership through the task
create policy "task_goals: select if own task"
  on haia.task_goals for select
  using (
    exists (
      select 1 from haia.tasks t
      where t.id = task_id and t.user_id = auth.uid()
    )
  );

create policy "task_goals: insert if own task and goal"
  on haia.task_goals for insert
  with check (
    exists (select 1 from haia.tasks t where t.id = task_id and t.user_id = auth.uid()) and
    exists (select 1 from haia.goals g where g.id = goal_id and g.user_id = auth.uid())
  );

create policy "task_goals: delete if own task"
  on haia.task_goals for delete
  using (
    exists (
      select 1 from haia.tasks t
      where t.id = task_id and t.user_id = auth.uid()
    )
  );

-- habits
create policy "habits: all own rows"
  on haia.habits for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- habit_logs
create policy "habit_logs: all own rows"
  on haia.habit_logs for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- habit_goals (junction)
create policy "habit_goals: select if own habit"
  on haia.habit_goals for select
  using (
    exists (
      select 1 from haia.habits h
      where h.id = habit_id and h.user_id = auth.uid()
    )
  );

create policy "habit_goals: insert if own habit and goal"
  on haia.habit_goals for insert
  with check (
    exists (select 1 from haia.habits h where h.id = habit_id and h.user_id = auth.uid()) and
    exists (select 1 from haia.goals  g where g.id = goal_id  and g.user_id = auth.uid())
  );

create policy "habit_goals: delete if own habit"
  on haia.habit_goals for delete
  using (
    exists (
      select 1 from haia.habits h
      where h.id = habit_id and h.user_id = auth.uid()
    )
  );

-- xp_events — client reads only; all writes go through backend service role
create policy "xp_events: read own rows"
  on haia.xp_events for select
  using (user_id = auth.uid());

-- streaks — client reads only; writes via backend service role (streak job)
create policy "streaks: read own rows"
  on haia.streaks for select
  using (user_id = auth.uid());

-- achievements — client reads only; writes via backend service role
create policy "achievements: read own rows"
  on haia.achievements for select
  using (user_id = auth.uid());

-- integrations
create policy "integrations: all own rows"
  on haia.integrations for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- chat_messages
create policy "chat_messages: all own rows"
  on haia.chat_messages for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());


-- =============================================================================
-- REALTIME
-- Enable Supabase Realtime on tables the dashboard needs to subscribe to.
-- =============================================================================

alter publication supabase_realtime add table haia.tasks;
alter publication supabase_realtime add table haia.habit_logs;
alter publication supabase_realtime add table haia.users;          -- XP bar / level updates
alter publication supabase_realtime add table haia.streaks;
alter publication supabase_realtime add table haia.chat_messages;


-- =============================================================================
-- TRIGGER: auto-create haia.users row on Supabase Auth signup
-- Fires after every insert into auth.users so every new account immediately
-- has a profile row without any additional API call from the client.
-- =============================================================================

create or replace function haia.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = haia
as $$
begin
  insert into haia.users (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function haia.handle_new_user();


-- =============================================================================
-- ACHIEVEMENT KEY CONTRACT
-- These keys are used by the gamification service (api/gamification/).
-- Corresponding rows are inserted per-user on signup (by the backend).
--
--   'first_quest'         — complete your first task
--   'quest_10'            — complete 10 tasks
--   'quest_50'            — complete 50 tasks
--   'quest_100'           — complete 100 tasks total
--   'habit_streak_3'      — maintain a 3-day habit streak
--   'habit_streak_7'      — 7-day habit streak
--   'habit_streak_30'     — 30-day habit streak
--   'first_goal'          — create your first goal
--   'goal_completed'      — mark a goal as completed
--   'level_5'             — reach level 5
--   'level_10'            — reach level 10
--   'level_25'            — reach level 25
--   'syllabus_imported'   — bulk syllabus import used at least once
--   'schedule_synced'     — COR photo → Google Calendar sync completed
--   'telegram_connected'  — Telegram bot successfully linked
--   'email_connected'     — email-to-task pipeline configured
-- =============================================================================


-- =============================================================================
-- =============================================================================
-- END OF MIGRATION: 001_initial_schema.sql
-- =============================================================================

-- =============================================================================
-- GRANTS
-- =============================================================================
GRANT USAGE ON SCHEMA haia TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA haia TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA haia TO anon, authenticated, service_role;
