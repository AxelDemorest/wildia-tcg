-- Supabase Auth links an OAuth identity to an existing account with the same e-mail, and
-- creates a new account for an unknown one, whether or not the provider vouches for that
-- e-mail. Three takeovers follow, so the database refuses them when an identity is inserted
-- (R1, R2) or updated (R3):
--   R1. an identity whose provider did not verify its e-mail (identity_data.email_verified is
--       not true): anyone could claim an address they do not own, then sit on its account (or
--       on the account created for it) the day its owner signs up;
--   R2. an OAuth identity for a user who already has an `email` identity: e-mail confirmation
--       is off (see CYR-119), so someone may have pre-registered an address they do not own and
--       still hold its password. Linking the real owner's verified Google or Discord identity
--       would put the owner into that account;
--   R3. an update of an OAuth identity that moves its e-mail to another address the provider
--       does not vouch for. At each sign-in with a known identity, Supabase Auth runs
--       UpdateOnly(identity, "identity_data", "last_sign_in_at"), and auth.identities.email is
--       generated from identity_data. Without R3, an attacker changes the e-mail of their
--       provider account to an unverified victim address, signs in again, and a later verified
--       sign-in of the victim is linked to the attacker's account. An update that keeps the
--       same e-mail stays allowed.
-- Google and Discord identities of one account stay allowed (verified, no `email` identity).
--
-- Supabase Auth creates the user and its first identity in one transaction: a refusal here
-- rolls back the user, so no auth.users nor profiles row is left behind. The visitor comes back
-- with error=server_error and the description "Error creating identity", which the login
-- shows as `account_refused` (lib/auth/oauth-error.ts).
--
-- The function reads auth.identities, so it is SECURITY DEFINER, in a schema the Data API does
-- not expose, and no API role may execute it (a trigger fires without that privilege).
create schema if not exists private;

create or replace function private.guard_provider_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- R1 also applies to `phone` and `web3` identities, disabled today: enabling SMS or Solana
  -- sign-in later needs a change here.
  if new.provider = 'email' then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.identity_data ->> 'email' is distinct from old.identity_data ->> 'email'
      and coalesce(new.identity_data ->> 'email_verified', 'false') <> 'true' then
      raise exception 'identity refused: the e-mail of the % account changed to an unverified one', new.provider;
    end if;

    return new;
  end if;

  if coalesce(new.identity_data ->> 'email_verified', 'false') <> 'true' then
    raise exception 'identity refused: the e-mail of the % account is not verified', new.provider;
  end if;

  if exists (
    select 1 from auth.identities i
    where i.user_id = new.user_id and i.provider = 'email'
  ) then
    raise exception 'identity refused: the account already signs in with an e-mail and a password';
  end if;

  return new;
end;
$$;

revoke all on function private.guard_provider_identity()
  from public, anon, authenticated, service_role;

create trigger guard_provider_identity
  before insert or update of identity_data on auth.identities
  for each row
  execute function private.guard_provider_identity();
