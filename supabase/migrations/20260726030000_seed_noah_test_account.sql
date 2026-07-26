delete from public.app_sessions
where user_id in (
  select id
  from public.app_users
  where username = 'noah'
);

insert into public.app_users (id, username, password_hash)
values (
  '11111111-1111-4111-8111-111111111111',
  'noah',
  'scrypt:v1:tropic-together-noah-seed:314b64877a631d9de22f6ded127e1614f93b83ee9aa4056cec3eb1b9134e1363daad0808f975da70de31c24cbd3f3427bb05649f5fbf459e9f632b19f540513d'
)
on conflict (username) do update
set
  id = excluded.id,
  password_hash = excluded.password_hash,
  updated_at = now();

update public.trip_phase1_workspaces
set
  data = jsonb_set(
    jsonb_set(
      data,
      '{trip,inviteCode}',
      to_jsonb('PENANG26'::text),
      true
    ),
    '{trip,inviteUrl}',
    to_jsonb('/join/PENANG26'::text),
    true
  ),
  updated_at = now()
where id = 'penang-kota-kinabalu-2026';

update public.trip_phase1_workspaces
set
  data = jsonb_set(
    data,
    '{members}',
    (
      select jsonb_agg(
        case
          when member ->> 'id' = 'member-noah'
            then member || jsonb_build_object(
              'appUserId',
              '11111111-1111-4111-8111-111111111111'
            )
          else member
        end
      )
      from jsonb_array_elements(data -> 'members') as member
    ),
    false
  ),
  updated_at = now()
where id = 'penang-kota-kinabalu-2026'
  and jsonb_typeof(data -> 'members') = 'array';
