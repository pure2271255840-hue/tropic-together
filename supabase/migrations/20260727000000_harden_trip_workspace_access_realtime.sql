create or replace function public.trip_phase1_workspace_has_member(
  workspace_data jsonb,
  app_user_id uuid
)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from jsonb_array_elements(coalesce(workspace_data->'members', '[]'::jsonb)) as member
    where member->>'appUserId' = app_user_id::text
  );
$$;

create or replace function public.trip_phase1_workspace_has_owner(
  workspace_data jsonb,
  app_user_id uuid
)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from jsonb_array_elements(coalesce(workspace_data->'members', '[]'::jsonb)) as member
    where member->>'appUserId' = app_user_id::text
      and member->>'role' = 'owner'
  );
$$;

drop policy if exists "phase1 workspaces are readable in prototype"
  on public.trip_phase1_workspaces;
drop policy if exists "phase1 workspaces can be created in prototype"
  on public.trip_phase1_workspaces;
drop policy if exists "phase1 workspaces can be updated in prototype"
  on public.trip_phase1_workspaces;
drop policy if exists "phase1 workspaces can be deleted in prototype"
  on public.trip_phase1_workspaces;

revoke select, insert, update, delete
  on table public.trip_phase1_workspaces
  from anon, authenticated;

grant select
  on table public.trip_phase1_workspaces
  to authenticated;

grant select, insert, update, delete
  on table public.trip_phase1_workspaces
  to service_role;

grant execute
  on function public.trip_phase1_workspace_has_member(jsonb, uuid)
  to authenticated, service_role;

grant execute
  on function public.trip_phase1_workspace_has_owner(jsonb, uuid)
  to authenticated, service_role;

create policy "phase1 workspaces are readable by trip members"
  on public.trip_phase1_workspaces
  for select
  to authenticated
  using (
    auth.uid() is not null
    and auth.jwt() ->> 'trip_id' = id
    and public.trip_phase1_workspace_has_member(data, auth.uid())
  );

alter table public.trip_phase1_workspaces replica identity full;

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  )
  and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'trip_phase1_workspaces'
  ) then
    execute 'alter publication supabase_realtime add table public.trip_phase1_workspaces';
  end if;
end;
$$;
