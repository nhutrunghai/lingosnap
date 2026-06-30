-- Shift Streak schedule so the first day starts tomorrow (2026-07-01)
-- and set each day target to 14h while keeping the existing time slots,
-- subjects, durations, statuses, and notes unchanged.
--
-- Run this in Supabase SQL Editor. If auth.uid() is unavailable there,
-- the script targets the owner that has the most streak_tasks rows.

do $$
declare
  target_owner_id uuid;
  target_start_date date := date '2026-07-01';
  first_streak_date date;
  date_offset integer;
begin
  target_owner_id := auth.uid();

  if target_owner_id is null then
    select owner_id
      into target_owner_id
    from public.streak_tasks
    group by owner_id
    order by count(*) desc, min(study_date)
    limit 1;
  end if;

  if target_owner_id is null then
    raise exception 'No streak owner found';
  end if;

  select min(study_date)
    into first_streak_date
  from public.streak_tasks
  where owner_id = target_owner_id;

  if first_streak_date is null then
    raise exception 'No streak_tasks found for owner %', target_owner_id;
  end if;

  date_offset := target_start_date - first_streak_date;

  create temp table tmp_shifted_streak_day_notes on commit drop as
  select
    owner_id,
    (study_date + date_offset)::date as study_date,
    weekday,
    '14h'::text as total_hours,
    notes,
    created_at
  from public.streak_day_notes
  where owner_id = target_owner_id;

  update public.streak_tasks
  set study_date = (study_date + date_offset)::date
  where owner_id = target_owner_id;

  delete from public.streak_day_notes
  where owner_id = target_owner_id;

  insert into public.streak_day_notes (
    owner_id,
    study_date,
    weekday,
    total_hours,
    notes,
    created_at
  )
  select
    owner_id,
    study_date,
    weekday,
    total_hours,
    notes,
    created_at
  from tmp_shifted_streak_day_notes;

  insert into public.streak_day_notes (
    owner_id,
    study_date,
    weekday,
    total_hours,
    notes
  )
  select distinct
    target_owner_id,
    task.study_date,
    '',
    '14h',
    ''
  from public.streak_tasks task
  where task.owner_id = target_owner_id
  on conflict (owner_id, study_date) do update
  set total_hours = '14h';

  raise notice 'Shifted streak owner % from % to %, offset % days, daily target 14h',
    target_owner_id,
    first_streak_date,
    target_start_date,
    date_offset;
end $$;
