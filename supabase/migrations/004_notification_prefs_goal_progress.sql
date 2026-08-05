-- Migration 004: notification preferences + auto goal progress
-- ─────────────────────────────────────────────────────────────

-- 1. Add notification_preferences JSONB to users table
alter table haia.users
  add column if not exists notification_preferences jsonb default '{}'::jsonb;

-- 2. Function: recalculate goal progress (%) from task_goals whenever a task
--    changes status to 'completed'. Writes the result back to goals.current_value
--    so the frontend progress bar is always accurate without polling.
create or replace function haia.recalculate_goal_progress()
returns trigger language plpgsql security definer as $$
declare
  v_goal_id   uuid;
  v_total     int;
  v_completed int;
  v_pct       numeric;
begin
  -- For each goal linked to this task, recompute % complete
  for v_goal_id in
    select goal_id from haia.task_goals where task_id = new.id
  loop
    select
      count(*)                                                    into v_total
    from haia.task_goals tg
    join haia.tasks t on t.id = tg.task_id
    where tg.goal_id = v_goal_id;

    select
      count(*)                                                    into v_completed
    from haia.task_goals tg
    join haia.tasks t on t.id = tg.task_id
    where tg.goal_id = v_goal_id
      and t.status = 'completed';

    if v_total > 0 then
      v_pct := round((v_completed::numeric / v_total) * 100, 2);
      update haia.goals
        set current_value = v_pct,
            status = case when v_pct >= 100 then 'completed' else status end,
            updated_at = now()
        where id = v_goal_id;
    end if;
  end loop;

  return new;
end;
$$;

-- 3. Attach trigger — fires after any task row's status changes to 'completed'
drop trigger if exists trg_goal_progress_on_task_complete on haia.tasks;
create trigger trg_goal_progress_on_task_complete
  after update of status on haia.tasks
  for each row
  when (new.status = 'completed' and old.status <> 'completed')
  execute function haia.recalculate_goal_progress();
