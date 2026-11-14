-- Fix: gen_random_bytes lives in extensions schema (search_path = public only)

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
