-- Coin grants (espace administration): the trace of each grant of coins by the super
-- administrateur, and the function that credits an account and keeps the grant in the same
-- transaction. Only the server (service role) reaches either, after checking the staff session;
-- the browser never reads nor writes the grants.

-- 1. One row per grant. The account's ledger row (currency_ledger, type admin_adjust) points at
--    it by reference_id and carries neither the author nor the reason: players read their own
--    ledger rows, and no team member is shown to them (docs/adr/0004). A grant goes with its
--    target's account, and outlives its author's account, without an author.
create table public.admin_coin_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- The ledger's amount type: a grant always fits in its ledger row.
  amount numeric(14, 4) not null,
  reason text,
  author_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.admin_coin_grants enable row level security;

-- No policy on purpose (as team_members and admin_setting_changes): the server writes the grants
-- with the service role only, never from the browser, not even a super administrateur's own
-- session.
revoke all on public.admin_coin_grants from anon, authenticated;

-- 2. Credits p_user_id with p_amount coins for the author p_author_id: the grant row, then the
--    ledger row that points at it, its metadata left empty. An account without profile (deleted
--    since the registry showed it) is refused as unknown_account, which the dialog says; if
--    either row cannot be written (an unknown author), neither is. A positive row needs no lock:
--    the balance is the ledger's sum. p_reason: the grant's optional reason, kept in the grant
--    only. No bounds here: the server checks them before calling. Security invoker: it runs with
--    its caller's rights, and only the service role may call it.
create function public.admin_grant_coins(
  p_user_id uuid,
  p_amount numeric,
  p_author_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_grant_id uuid;
begin
  if not exists (select 1 from public.profiles p where p.id = p_user_id) then
    raise exception 'unknown_account';
  end if;

  insert into public.admin_coin_grants (user_id, amount, reason, author_id)
  values (p_user_id, p_amount, p_reason, p_author_id)
  returning id into v_grant_id;

  insert into public.currency_ledger (user_id, amount, type, reference_id)
  values (p_user_id, p_amount, 'admin_adjust', v_grant_id);
end;
$$;

-- Creates coins: no grant to visitors nor players, not even to a super administrateur's own
-- session. The server calls it with the service role.
revoke execute on function public.admin_grant_coins(uuid, numeric, uuid, text)
  from public, anon, authenticated;
grant execute on function public.admin_grant_coins(uuid, numeric, uuid, text) to service_role;
