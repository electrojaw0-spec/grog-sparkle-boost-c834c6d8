
create table public.versus_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  subject_id text not null,
  status text not null default 'waiting', -- waiting | playing | done
  phase text not null default 'ready',    -- ready | answer | reveal | done
  player1_name text not null,
  player2_name text,
  question_indexes int[] not null default '{}',
  current_round int not null default 0,
  current_turn int not null default 0,
  scores int[] not null default '{0,0}',
  last_pick int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index versus_rooms_code_idx on public.versus_rooms (code);

alter table public.versus_rooms enable row level security;

-- Public party game: anyone (anon) can read/insert/update rooms.
create policy "anyone can read rooms"
  on public.versus_rooms for select
  using (true);

create policy "anyone can create rooms"
  on public.versus_rooms for insert
  with check (true);

create policy "anyone can update rooms"
  on public.versus_rooms for update
  using (true) with check (true);

-- Auto-cleanup: rooms older than 6 hours can be deleted by anyone (light cleanup)
create policy "anyone can delete old rooms"
  on public.versus_rooms for delete
  using (created_at < now() - interval '6 hours');

-- Realtime
alter table public.versus_rooms replica identity full;
alter publication supabase_realtime add table public.versus_rooms;
