-- Coming-soon contest: e-mail only, no auth user is created.

create table public.contest_entries (
  id uuid primary key default gen_random_uuid(),
  contest_key text not null,
  email text not null,
  created_at timestamptz not null default now(),
  constraint contest_entries_email_normalized check (
    email = lower(btrim(email)) and char_length(email) between 3 and 254
  ),
  constraint contest_entries_unique_email unique (contest_key, email)
);

alter table public.contest_entries enable row level security;

-- No policy on purpose: entries are written by the server (service role) only
-- and are never readable from the browser.
revoke all on public.contest_entries from anon, authenticated;
