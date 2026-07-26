create extension if not exists pgcrypto;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_users_username_length check (char_length(username) between 2 and 32)
);

create table if not exists public.app_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.app_users enable row level security;
alter table public.app_sessions enable row level security;

create index if not exists app_sessions_user_id_idx
  on public.app_sessions (user_id);

create index if not exists app_sessions_expires_at_idx
  on public.app_sessions (expires_at);

create index if not exists app_users_username_lower_idx
  on public.app_users (lower(username));

grant usage on schema public to service_role;
grant select, insert, update, delete
  on table public.app_users, public.app_sessions
  to service_role;
