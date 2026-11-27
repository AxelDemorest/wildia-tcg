-- CYR-119: when someone signs up with an address that already belongs to an account that never
-- confirmed it, Supabase Auth keeps that first account and its password (signup.go: "we can't be
-- sure of their claimed identity"). An attacker who pre-registered the address of a player would
-- own the account the player then confirms. So the server deletes the unconfirmed account of an
-- address just before signing up with it, and Supabase Auth creates a fresh one.
--
-- auth.users is not exposed by the API (and auth.admin.listUsers has no e-mail filter): the
-- function runs as its owner (security definer), and only the server (service role) may call it.
-- One statement, so a confirmation that lands meanwhile cannot be deleted: the account must be
-- unconfirmed and have no identity other than `email` (an unconfirmed account linked to Google or
-- Discord belongs to a real owner). Cascades remove the account's identities and its rows in
-- `public`. Supabase Auth keeps the e-mail in lower case.
create or replace function public.delete_unconfirmed_account(p_email text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users u
  where u.email = lower(btrim(p_email))
    and u.email_confirmed_at is null
    and not exists (
      select 1 from auth.identities i
      where i.user_id = u.id and i.provider <> 'email'
    );
$$;

revoke execute on function public.delete_unconfirmed_account(text)
  from public, anon, authenticated;
grant execute on function public.delete_unconfirmed_account(text)
  to service_role;
