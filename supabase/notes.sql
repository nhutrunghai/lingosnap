create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled note',
  content text not null default '',
  mode text not null default 'markdown' check (mode in ('markdown', 'plain')),
  tags text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notes enable row level security;

drop policy if exists "users manage own notes" on public.notes;
create policy "users manage own notes"
  on public.notes
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create index if not exists notes_owner_updated_idx on public.notes(owner_id, updated_at desc);
create index if not exists notes_owner_title_idx on public.notes(owner_id, lower(title));
