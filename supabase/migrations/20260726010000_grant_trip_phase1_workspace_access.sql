grant usage on schema public to anon, authenticated;

grant select, insert, update, delete
  on table public.trip_phase1_workspaces
  to anon, authenticated;
