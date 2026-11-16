-- CYR-64 — boutique boosters: fenêtre boutique, weighted draw of booster types, offre boutique
-- persisted per player and per window (docs/adr/0001-booster-shop-rotation.md).
--
-- Every 180 s a new fenêtre boutique starts, the same for everyone. The first time a player
-- asks for the shop during a window, get_booster_shop_offer draws one booster type per
-- emplacement and stores the offer; later reads in that window return it unchanged.

-- 1. Shop config. shop_weight is the chance of a definition to appear in an emplacement,
--    relative to the other active ones; 0 means never offered. Existing definitions start with
--    equal weights.
alter table public.booster_definitions
  add column shop_weight numeric(14, 4) not null default 1,
  add constraint booster_definitions_shop_weight_non_negative check (shop_weight >= 0);

insert into public.economy_config (key, value, description)
values (
  'booster_shop_slot_count',
  6,
  'Nombre d’emplacements de chaque offre boutique (boutique boosters).'
)
on conflict (key) do nothing;

-- 2. The current fenêtre boutique, from the database clock. The only place that knows the
--    window lasts 180 s.
create or replace function private.booster_shop_window(
  out window_index bigint,
  out ends_at timestamptz
)
language sql
stable
set search_path = ''
as $$
  select w.idx, to_timestamp((w.idx + 1) * 180)
  from (select floor(extract(epoch from now()) / 180)::bigint as idx) w;
$$;

-- 3. One weighted draw among the active definitions with a positive shop_weight, in a fixed
--    order. TS mirror: pickWeightedBoosterType in lib/boosters/shop.ts; both must keep the
--    same candidate order (sort_order, id). Null when none is eligible.
--    VOLATILE because it calls random(): a STABLE function may return one result for every
--    row of a statement (see 20261115004436_harden_pick_weighted_rarity.sql).
create or replace function private.pick_shop_booster()
returns uuid
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_ids uuid[];
  v_weights numeric[];
  v_total numeric;
  v_roll numeric;
  v_acc numeric := 0;
  v_i integer;
begin
  -- One statement, so the candidates and their total come from the same snapshot.
  select
    array_agg(b.id order by b.sort_order, b.id),
    array_agg(b.shop_weight order by b.sort_order, b.id),
    sum(b.shop_weight)
  into v_ids, v_weights, v_total
  from public.booster_definitions b
  where b.is_active and b.shop_weight > 0;

  if v_total is null then
    return null;
  end if;

  v_roll := random() * v_total;

  for v_i in 1 .. array_length(v_ids, 1) loop
    v_acc := v_acc + v_weights[v_i];
    if v_roll < v_acc then
      return v_ids[v_i];
    end if;
  end loop;

  return v_ids[array_length(v_ids, 1)];
end;
$$;

revoke execute on function private.booster_shop_window() from public, anon, authenticated;
revoke execute on function private.pick_shop_booster() from public, anon, authenticated;

-- 4. The stored offers: one row per emplacement. Players read their own rows; only
--    get_booster_shop_offer writes them.
create table public.booster_shop_slots (
  user_id uuid not null references auth.users (id) on delete cascade,
  window_index bigint not null,
  slot_index smallint not null,
  booster_id uuid not null references public.booster_definitions (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint booster_shop_slots_pkey primary key (user_id, window_index, slot_index),
  constraint booster_shop_slots_slot_index_non_negative check (slot_index >= 0)
);

create index booster_shop_slots_booster_id_idx on public.booster_shop_slots (booster_id);

alter table public.booster_shop_slots enable row level security;

create policy "booster_shop_slots_select_own"
  on public.booster_shop_slots
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- 5. The signed-in player's offre boutique for the current window, created on the first call.
--    Concurrent first calls fill the emplacements in the same order and skip the ones already
--    taken, so they all return the single offer that got stored. A definition deactivated
--    during the window stays in the offers already drawn.
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
        )
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

revoke execute on function public.get_booster_shop_offer() from public, anon;
grant execute on function public.get_booster_shop_offer() to authenticated;
