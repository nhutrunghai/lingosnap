create table if not exists public.exercise_items (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  list_id text not null,
  type text not null default 'VOCAB',
  instruction text not null default '',
  question text not null default '',
  answer text not null default '',
  options jsonb not null default '[]'::jsonb,
  image_b64 text not null default '',
  date_learned text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.pomodoro_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  completed_at timestamptz not null default now(),
  study_date date not null default current_date,
  minutes integer not null default 25,
  created_at timestamptz not null default now()
);

alter table public.exercise_items enable row level security;
alter table public.pomodoro_sessions enable row level security;

drop policy if exists "users manage own exercises" on public.exercise_items;
create policy "users manage own exercises"
  on public.exercise_items
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "users manage own pomodoro" on public.pomodoro_sessions;
create policy "users manage own pomodoro"
  on public.pomodoro_sessions
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create index if not exists exercise_items_owner_list_idx on public.exercise_items(owner_id, list_id);
create index if not exists pomodoro_sessions_owner_date_idx on public.pomodoro_sessions(owner_id, study_date);

create table if not exists public.streak_tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  study_date date not null default current_date,
  time_slot text not null default '',
  subject text not null default '',
  duration_hours numeric(3,1) not null default 0.0,
  status text not null default 'Chưa bắt đầu', -- Chưa bắt đầu, Đang học, Đã hoàn thành
  notes text not null default '',
  created_at timestamptz not null default now()
);

alter table public.streak_tasks enable row level security;

drop policy if exists "users manage own streak tasks" on public.streak_tasks;
create policy "users manage own streak tasks"
  on public.streak_tasks
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create index if not exists streak_tasks_owner_date_idx on public.streak_tasks(owner_id, study_date);

