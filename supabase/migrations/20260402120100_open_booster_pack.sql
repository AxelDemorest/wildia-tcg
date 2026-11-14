-- Sprint 5 / TCG-502 — atomic booster open (sync, debit, draw, grant, log)

create or replace function public.pick_weighted_rarity(p_weights jsonb)
returns public.card_rarity
language plpgsql
stable
as $$
declare
  v_order text[] := array['common', 'uncommon', 'rare', 'epic', 'legendary'];
  v_key text;
  v_total numeric := 0;
  v_roll numeric;
  v_acc numeric := 0;
  v_weight numeric;
begin
  foreach v_key in array v_order loop
    if p_weights ? v_key then
      v_total := v_total + (p_weights ->> v_key)::numeric;
    end if;
  end loop;

  if v_total <= 0 then
    return 'common';
  end if;

  v_roll := random() * v_total;

  foreach v_key in array v_order loop
    if not (p_weights ? v_key) then
      continue;
    end if;
    v_weight := (p_weights ->> v_key)::numeric;
    v_acc := v_acc + v_weight;
    if v_roll < v_acc then
      return v_key::public.card_rarity;
    end if;
  end loop;

  return 'legendary';
end;
$$;

create or replace function public.open_booster_pack(
  p_booster_id uuid,
  p_user_id uuid default auth.uid()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_booster public.booster_definitions%rowtype;
  v_balance numeric;
  v_sync jsonb;
  v_results jsonb := '[]'::jsonb;
  v_i integer;
  v_rarity public.card_rarity;
  v_card_id uuid;
  v_card_slug text;
  v_card_rarity public.card_rarity;
  v_draw_id uuid;
  v_roll_seed text;
  v_entry jsonb;
begin
  v_uid := coalesce(p_user_id, auth.uid());
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if auth.uid() is not null and auth.uid() <> v_uid then
    raise exception 'forbidden';
  end if;

  select * into v_booster
  from public.booster_definitions
  where id = p_booster_id and is_active = true;

  if not found then
    raise exception 'booster not found';
  end if;

  v_sync := public.sync_user_economy(v_uid);
  v_balance := (v_sync ->> 'balance')::numeric;

  if v_balance < v_booster.cost_coins then
    raise exception 'insufficient_balance';
  end if;

  v_roll_seed := encode(extensions.gen_random_bytes(16), 'hex');

  for v_i in 1..v_booster.slots loop
    v_rarity := public.pick_weighted_rarity(v_booster.rarity_weights);

    select c.id, c.slug, c.rarity
    into v_card_id, v_card_slug, v_card_rarity
    from public.cards c
    where c.rarity = v_rarity
    order by random()
    limit 1;

    if v_card_id is null then
      select c.id, c.slug, c.rarity
      into v_card_id, v_card_slug, v_card_rarity
      from public.cards c
      order by random()
      limit 1;
    end if;

    v_entry := jsonb_build_object(
      'card_id', v_card_id,
      'slug', v_card_slug,
      'rarity', v_card_rarity::text
    );
    v_results := v_results || jsonb_build_array(v_entry);
  end loop;

  insert into public.draw_logs (user_id, booster_id, results, roll_seed)
  values (v_uid, v_booster.id, v_results, v_roll_seed)
  returning id into v_draw_id;

  insert into public.currency_ledger (user_id, amount, type, reference_id, metadata)
  values (
    v_uid,
    -v_booster.cost_coins,
    'booster_purchase',
    v_draw_id,
    jsonb_build_object('booster_slug', v_booster.slug, 'roll_seed', v_roll_seed)
  );

  for v_entry in select * from jsonb_array_elements(v_results) loop
    perform public.grant_card(
      v_uid,
      (v_entry ->> 'card_id')::uuid,
      1,
      'booster_open'
    );
  end loop;

  v_balance := public.user_currency_balance(v_uid);

  return jsonb_build_object(
    'draw_id', v_draw_id,
    'balance', v_balance,
    'cost', v_booster.cost_coins,
    'cards', v_results,
    'roll_seed', v_roll_seed
  );
end;
$$;

revoke all on function public.open_booster_pack (uuid, uuid) from public;
grant execute on function public.open_booster_pack (uuid, uuid) to authenticated;
grant execute on function public.open_booster_pack (uuid, uuid) to service_role;
