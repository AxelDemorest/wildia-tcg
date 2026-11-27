-- CYR-119: e-mail confirmation is back, so R2 of 20261126130000_oauth_identity_guard.sql (already
-- applied: not edited) can be relaxed. R1 and R3 stay as they are.
--
-- An OAuth identity may now be linked to an account that has an `email` identity when either:
--   B1. that `email` identity is verified: identity_data.email_verified is true, which Supabase
--       Auth sets only when the link of the confirmation mail is opened (verify.go, signupVerify);
--   B2. the account is not confirmed (auth.users.email_confirmed_at is null): the real owner of
--       the address is signing in with Google or Discord, and Supabase Auth, right after the link,
--       deletes the other identities of an unconfirmed account and clears its password
--       (RemoveUnconfirmedIdentities), so whoever pre-registered the address loses the account.
-- Anything else stays refused: an account confirmed without a click (Autoconfirm, "Confirm email"
-- off) has an `email` identity that was never verified. Never read raw_user_meta_data.email_verified:
-- a visitor chooses it at sign-up.
--
-- R1 comes first: an unverified provider e-mail is refused whatever the account.
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
    select 1
    from auth.identities i
    join auth.users u on u.id = i.user_id
    where i.user_id = new.user_id
      and i.provider = 'email'
      and u.email_confirmed_at is not null
      and coalesce(i.identity_data ->> 'email_verified', 'false') <> 'true'
  ) then
    raise exception 'identity refused: the account was confirmed without the link of the mail';
  end if;

  return new;
end;
$$;
