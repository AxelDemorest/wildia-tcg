-- Wildia team: one optional role per player account, for the admin area.

create type public.team_role as enum ('super_admin', 'moderator', 'viewer');

create table public.team_members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role public.team_role not null,
  created_at timestamptz not null default now()
);

alter table public.team_members enable row level security;

-- No policy on purpose: roles are read and written by the server (service
-- role) only, never from the browser, not even a member's own row.
revoke all on public.team_members from anon, authenticated;
