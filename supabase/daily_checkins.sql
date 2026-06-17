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
  unlock_hour integer not null default 10 check (unlock_hour between 0 and 23),
  timezone text not null default 'Asia/Ho_Chi_Minh',
  updated_at timestamptz not null default now()
);

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
