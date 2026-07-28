alter table public.app_users
  add column if not exists display_name text;

update public.app_users
set display_name = left(coalesce(nullif(btrim(display_name), ''), username), 24)
where display_name is null or btrim(display_name) = '';

alter table public.app_users
  alter column display_name set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'app_users_display_name_length'
      and conrelid = 'public.app_users'::regclass
  ) then
    alter table public.app_users
      add constraint app_users_display_name_length
      check (char_length(btrim(display_name)) between 1 and 24);
  end if;
end $$;
