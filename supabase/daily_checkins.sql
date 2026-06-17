create table if not exists public.daily_checkins (
  owner_id uuid not null references auth.users(id) on delete cascade,
  study_date date not null,
  checked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key(owner_id, study_date)
);

create table if not exists public.daily_checkin_settings (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  target_days integer not null default 7 check (target_days between 1 and 365),
  unlock_hour integer not null default 22 check (unlock_hour between 0 and 23),
  timezone text not null default 'Asia/Ho_Chi_Minh',
  current_level_index integer not null default 0 check (current_level_index between 0 and 5),
  unlocked_level_index integer not null default 0 check (unlocked_level_index between 0 and 5),
  start_date date,
  updated_at timestamptz not null default now()
);

alter table public.daily_checkin_settings
  add column if not exists current_level_index integer not null default 0 check (current_level_index between 0 and 5),
  add column if not exists unlocked_level_index integer not null default 0 check (unlocked_level_index between 0 and 5),
  add column if not exists start_date date;

alter table public.daily_checkin_settings
  alter column unlock_hour set default 22;

update public.daily_checkin_settings
set unlock_hour = 22,
    current_level_index = least(greatest(coalesce(current_level_index, 0), 0), 5),
    unlocked_level_index = least(greatest(coalesce(unlocked_level_index, 0), 0), 5),
    target_days = case least(greatest(coalesce(current_level_index, 0), 0), 5)
      when 0 then 7
      when 1 then 30
      when 2 then 90
      when 3 then 150
      when 4 then 240
      else 365
    end;

alter table public.daily_checkins enable row level security;
alter table public.daily_checkin_settings enable row level security;

drop policy if exists "users manage own daily checkins" on public.daily_checkins;
create policy "users manage own daily checkins"
  on public.daily_checkins
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "users manage own daily checkin settings" on public.daily_checkin_settings;
create policy "users manage own daily checkin settings"
  on public.daily_checkin_settings
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create index if not exists daily_checkins_owner_date_idx on public.daily_checkins(owner_id, study_date desc);
