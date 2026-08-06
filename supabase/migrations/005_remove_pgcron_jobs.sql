-- Migration 005: Remove pg_cron jobs that have been migrated to APScheduler in
-- the FastAPI backend (main.py). This makes the Python layer the single source
-- of truth for all scheduled jobs, eliminating the operational complexity of
-- split pg_cron + APScheduler coordination.
--
-- Jobs replaced:
--   'reset-streaks-midnight'   → job_streak_reset()   in api/main.py (00:00 Asia/Manila)
--   'send-daily-reminders-7am' → job_daily_digest()   in api/main.py (07:00 Asia/Manila)
--
-- The pg_cron extension and pg_net extension are left enabled; they may still
-- be useful for future DB-side jobs. Only the specific job schedules are removed.

-- Remove the streak-reset pg_cron job
SELECT cron.unschedule('reset-streaks-midnight');

-- Remove the daily-reminder pg_cron job
SELECT cron.unschedule('send-daily-reminders-7am');

-- Drop the now-unused PL/pgSQL helper function
DROP FUNCTION IF EXISTS haia.send_daily_telegram_reminders();
