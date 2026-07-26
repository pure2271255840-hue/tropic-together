create table if not exists public.trip_phase1_workspaces (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.trip_phase1_workspaces enable row level security;

create policy "phase1 workspaces are readable in prototype"
  on public.trip_phase1_workspaces
  for select
  to anon, authenticated
  using (true);

create policy "phase1 workspaces can be created in prototype"
  on public.trip_phase1_workspaces
  for insert
  to anon, authenticated
  with check (true);

create policy "phase1 workspaces can be updated in prototype"
  on public.trip_phase1_workspaces
  for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "phase1 workspaces can be deleted in prototype"
  on public.trip_phase1_workspaces
  for delete
  to anon, authenticated
  using (true);

create index if not exists trip_phase1_workspaces_updated_at_idx
  on public.trip_phase1_workspaces (updated_at desc);

create index if not exists trip_phase1_workspaces_data_gin_idx
  on public.trip_phase1_workspaces using gin (data);
