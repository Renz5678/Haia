-- =============================================================================
-- Migration: 002_flexible_habits.sql
-- Adds 'flexible' frequency and 'target_count' to habits.
-- =============================================================================

-- 1. Drop existing check constraint
ALTER TABLE haia.habits DROP CONSTRAINT IF EXISTS habits_frequency_check;

-- 2. Add 'flexible' to the allowed frequency values
ALTER TABLE haia.habits ADD CONSTRAINT habits_frequency_check 
  CHECK (frequency IN ('daily', 'weekdays', 'weekends', 'custom', 'flexible'));

-- 3. Add target_count for flexible habits (e.g. 4 times per week)
ALTER TABLE haia.habits ADD COLUMN target_count integer;
