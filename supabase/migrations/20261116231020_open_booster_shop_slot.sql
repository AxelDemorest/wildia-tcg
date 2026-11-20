-- CYR-65 — boutique boosters: opening a booster from an emplacement of the offre boutique
-- (docs/adr/0001-booster-shop-rotation.md).
--
-- A player opens an emplacement of their current offer, never a booster id of their choice:
-- the definition stored in that emplacement is opened at its current price, the same way
-- open_booster_pack does, and the emplacement is épuisé for the rest of the window.

-- 1. The épuisé state of an emplacement: when it was opened and the draw it gave, set together.
--    The draw is deleted with its account, like the emplacement, so the cascade from auth.users
--    works whichever row goes first.
alter table public.booster_shop_slots
  add column opened_at timestamptz,
  add column draw_id uuid references public.draw_logs (id) on delete cascade,
  add constraint booster_shop_slots_opened_with_draw
    check ((opened_at is null) = (draw_id is null));

create index booster_shop_slots_draw_id_idx on public.booster_shop_slots (draw_id);

-- 2. The opening itself, moved out of open_booster_pack so both ways of opening share it: the
--    definition must be active and the balance (after the farm sync, which locks the profile)
--    must cover its price; then one card is drawn per slot, the draw is logged, the price
--    debited and the cards granted. Callers check that the caller may open for p_user_id.
--    Not SECURITY DEFINER: it runs with the rights of its SECURITY DEFINER callers, and no API
--    role may execute it.
create or replace function private.open_booster_for(p_user_id uuid, p_booster_id uuid)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
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
  select * into v_booster
  from public.booster_definitions
  where id = p_booster_id and is_active = true;

  if not found then
    raise exception 'booster not found';
  end if;

  v_sync := public.sync_user_economy(p_user_id);
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
  values (p_user_id, v_booster.id, v_results, v_roll_seed)
  returning id into v_draw_id;

  insert into public.currency_ledger (user_id, amount, type, reference_id, metadata)
  values (
    p_user_id,
    -v_booster.cost_coins,
    'booster_purchase',
    v_draw_id,
    jsonb_build_object('booster_slug', v_booster.slug, 'roll_seed', v_roll_seed)
  );

  for v_entry in select * from jsonb_array_elements(v_results) loop
    perform public.grant_card(
      p_user_id,
      (v_entry ->> 'card_id')::uuid,
      1,
      'booster_open'
    );
  end loop;

  v_balance := public.user_currency_balance(p_user_id);

  return jsonb_build_object(
    'draw_id', v_draw_id,
    'balance', v_balance,
    'cost', v_booster.cost_coins,
    'cards', v_results,
    'roll_seed', v_roll_seed
  );
end;
$$;

revoke execute on function private.open_booster_for(uuid, uuid) from public, anon, authenticated;

-- 3. open_booster_pack: same signature, checks and messages as before, on top of the shared
--    opening. CREATE OR REPLACE keeps its grants (signed-in players and the service role).
create or replace function public.open_booster_pack(
  p_booster_id uuid,
  p_user_id uuid default auth.uid()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
begin
  v_uid := coalesce(p_user_id, auth.uid());
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if auth.uid() is not null and auth.uid() <> v_uid then
    raise exception 'forbidden';
  end if;

  return private.open_booster_for(v_uid, p_booster_id);
end;
$$;

-- 4. Opens the emplacement p_slot_index of the signed-in player's offer for the window
--    p_window_index. Refusals, checked in this order, with nothing debited or consumed:
--    window_closed (not the current window), slot_not_found (no such stored emplacement),
--    slot_exhausted (already opened), booster_unavailable (its definition was deactivated),
--    insufficient_balance (from the shared opening).
--    Locks, always in this order: the emplacement, its definition, then the profile (in
--    sync_user_economy). Concurrent openings of one emplacement wait for the first one and
--    then find it épuisé; openings of two emplacements wait for each other's debit at the
--    profile, so the second sees the balance the first left.
create or replace function public.open_booster_shop_slot(
  p_window_index bigint,
  p_slot_index integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_booster_id uuid;
  v_opened_at timestamptz;
  v_result jsonb;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if p_window_index is distinct from (select w.window_index from private.booster_shop_window() w)
  then
    raise exception 'window_closed';
  end if;

  select s.booster_id, s.opened_at
  into v_booster_id, v_opened_at
  from public.booster_shop_slots s
  where s.user_id = v_uid
    and s.window_index = p_window_index
    and s.slot_index = p_slot_index
  for update;

  if not found then
    raise exception 'slot_not_found';
  end if;

  if v_opened_at is not null then
    raise exception 'slot_exhausted';
  end if;

  -- FOR SHARE, not the KEY SHARE of the draw_logs foreign key: a deactivation or a price
  -- change waits for this opening, so the shared opening sees the definition checked here.
  perform 1
  from public.booster_definitions b
  where b.id = v_booster_id and b.is_active
  for share;

  if not found then
    raise exception 'booster_unavailable';
  end if;

  v_result := private.open_booster_for(v_uid, v_booster_id);

  update public.booster_shop_slots s
  set opened_at = now(), draw_id = (v_result ->> 'draw_id')::uuid
  where s.user_id = v_uid
    and s.window_index = p_window_index
    and s.slot_index = p_slot_index;

  return v_result;
end;
$$;

revoke execute on function public.open_booster_shop_slot(bigint, integer) from public, anon;
grant execute on function public.open_booster_shop_slot(bigint, integer) to authenticated;

-- 5. get_booster_shop_offer: unchanged (20261115231200_booster_shop.sql), except that each
--    emplacement also says whether it is épuisé.
create or replace function public.get_booster_shop_offer()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_window_index bigint;
  v_ends_at timestamptz;
  v_slot_count integer;
  v_slot integer;
  v_booster_id uuid;
  v_slots jsonb;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select w.window_index, w.ends_at
  into v_window_index, v_ends_at
  from private.booster_shop_window() w;

  if not exists (
    select 1
    from public.booster_shop_slots s
    where s.user_id = v_uid and s.window_index = v_window_index
  ) then
    delete from public.booster_shop_slots s
    where s.user_id = v_uid and s.window_index < v_window_index;

    -- Rounded and bounded to 0..20 emplacements, whatever the config holds.
    v_slot_count := least(
      greatest(
        round(coalesce(
          (select c.value from public.economy_config c where c.key = 'booster_shop_slot_count'),
          6
        )),
        0
      ),
      20
    )::integer;

    for v_slot in 0 .. v_slot_count - 1 loop
      v_booster_id := private.pick_shop_booster();
      if v_booster_id is not null then
        insert into public.booster_shop_slots (user_id, window_index, slot_index, booster_id)
        values (v_uid, v_window_index, v_slot, v_booster_id)
        on conflict (user_id, window_index, slot_index) do nothing;
      end if;
    end loop;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'slot_index', s.slot_index,
        'booster', jsonb_build_object(
          'id', b.id,
          'slug', b.slug,
          'cost_coins', b.cost_coins,
          'slots', b.slots
        ),
        'exhausted', s.opened_at is not null
      )
      order by s.slot_index
    ),
    '[]'::jsonb
  )
  into v_slots
  from public.booster_shop_slots s
  join public.booster_definitions b on b.id = s.booster_id
  where s.user_id = v_uid and s.window_index = v_window_index;

  return jsonb_build_object(
    'window_index', v_window_index,
    'ends_at', v_ends_at,
    'slots', v_slots
  );
end;
$$;
