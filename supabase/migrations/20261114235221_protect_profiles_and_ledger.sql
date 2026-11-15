-- Close two gaps found while planning test coverage (tests/integration/economy-guards).
--
-- 1. Players update their own profiles row through the Data API (policy profiles_update_own),
--    and the table-wide UPDATE grant let them write any column: moving last_economy_sync_at
--    back made sync_user_economy credit coins for time that never passed, and
--    featured_card_id accepted cards they did not own.
-- 2. currency_ledger refused every DELETE, including the cascade from auth.users, so any
--    account with at least one coin movement could no longer be deleted.

-- 1a. Players may only update the columns the app writes (server/profiles/*).
--     last_economy_sync_at stays writable by sync_user_economy, which runs as its owner.
revoke update on public.profiles from anon, authenticated;
grant update (display_name, bio, is_public, featured_card_id, banner_url, updated_at)
  on public.profiles to authenticated;

-- 1b. A featured card must be owned, whatever client writes it. Runs as the caller: the
--     user_cards_select_own policy already lets a player see their own cards.
create or replace function public.profiles_check_featured_card()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.featured_card_id is not null and not exists (
    select 1
    from public.user_cards uc
    where uc.user_id = new.id
      and uc.card_id = new.featured_card_id
      and uc.quantity > 0
  ) then
    raise exception 'featured card is not owned by this user'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger profiles_featured_card_owned
  before insert or update of featured_card_id on public.profiles
  for each row
  execute function public.profiles_check_featured_card();

-- 2. currency_ledger stays append-only, except for the rows of a user who no longer exists,
--    which is the ON DELETE CASCADE from auth.users. Checking auth.users needs its owner's
--    rights, so the function is SECURITY DEFINER, in a schema the Data API does not expose,
--    and no API role may execute it (triggers fire without that privilege).
create schema if not exists private;

create or replace function private.currency_ledger_append_only()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and not exists (select 1 from auth.users u where u.id = old.user_id) then
    return old;
  end if;
  raise exception 'currency_ledger is append-only';
end;
$$;

revoke all on function private.currency_ledger_append_only()
  from public, anon, authenticated, service_role;

drop trigger currency_ledger_no_update on public.currency_ledger;
drop trigger currency_ledger_no_delete on public.currency_ledger;

create trigger currency_ledger_no_update
  before update on public.currency_ledger
  for each row
  execute function private.currency_ledger_append_only();

create trigger currency_ledger_no_delete
  before delete on public.currency_ledger
  for each row
  execute function private.currency_ledger_append_only();

drop function public.currency_ledger_deny_mutation();
