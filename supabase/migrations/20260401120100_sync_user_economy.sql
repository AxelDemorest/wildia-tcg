-- Sprint 4 / TCG-402 — lazy farm sync

create or replace function public.sync_user_economy(p_user_id uuid default auth.uid())
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_last timestamptz;
  v_now timestamptz := now();
  v_delta_seconds numeric;
  v_rate numeric;
  v_multiplier numeric;
  v_accrued numeric;
  v_balance numeric;
begin
  v_uid := coalesce(p_user_id, auth.uid());
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if auth.uid() is not null and auth.uid() <> v_uid then
    raise exception 'forbidden';
  end if;

  select last_economy_sync_at
  into v_last
  from public.profiles
  where id = v_uid
  for update;

  if not found then
    raise exception 'profile not found';
  end if;

  v_delta_seconds := greatest(0, extract(epoch from (v_now - v_last)));

  select coalesce(
    (
      select sum(c.farm_rate_base * uc.quantity::numeric)
      from public.user_cards uc
      inner join public.cards c on c.id = uc.card_id
      where uc.user_id = v_uid
    ),
    0
  )
  into v_rate;

  select coalesce(
    (select value from public.economy_config where key = 'farm_global_multiplier'),
    1
  )
  into v_multiplier;

  -- Coins = floor(total rate per second × elapsed seconds × multiplier)
  v_accrued := floor(v_rate * v_delta_seconds * v_multiplier);

  if v_accrued > 0 then
    insert into public.currency_ledger (user_id, amount, type, metadata)
    values (
      v_uid,
      v_accrued,
      'farm_accrual',
      jsonb_build_object(
        'delta_seconds', v_delta_seconds,
        'farm_rate_per_sec', v_rate,
        'multiplier', v_multiplier
      )
    );
  end if;

  update public.profiles
  set
    last_economy_sync_at = v_now,
    updated_at = v_now
  where id = v_uid;

  select public.user_currency_balance(v_uid) into v_balance;

  return jsonb_build_object(
    'balance', v_balance,
    'accrued', v_accrued,
    'delta_seconds', v_delta_seconds
  );
end;
$$;

revoke all on function public.sync_user_economy (uuid) from public;
grant execute on function public.sync_user_economy (uuid) to authenticated;
grant execute on function public.sync_user_economy (uuid) to service_role;
