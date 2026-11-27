-- Booster settings (espace administration): the function that changes a booster définition and
-- records each changed value in the historique des paramètres (admin_setting_changes, created by
-- 20261124120000_admin_settings.sql) in the same transaction. Only the server (service role)
-- calls it, after checking the staff session.

-- Applies p_changes to the booster p_slug for the author p_author_id. p_changes holds the values
-- to set by column, each one optional: {"cost_coins": 450, "slots": 5, "shop_weight": 30,
-- "is_active": true, "rarity_weights": {"rare": 20}}; a rarity not given keeps its chance. Each
-- changed value adds its history row ('booster_definition', slug, its column or
-- 'rarity_weights.<rarity>'), in the card's order: price, cards, shop weight, active, then the
-- chances from common to mythic. A rarity the définition does not list has a chance of 0: its key
-- is only added once set to another value. Unchanged values write nothing and return null;
-- otherwise the id of the last row written. If a row cannot be written, no value changes either.
-- The old values are read here, never received, under a lock of every booster: changes arriving
-- at the same moment apply one after the other, each recording the values the previous one left.
-- Refused, writing nothing: unknown_booster; no_available_booster when no active booster with a
-- positive shop weight would remain (the boutique would have nothing to offer);
-- no_positive_chance when the booster would have no positive chance (it could not draw a card).
-- p_restored_from: on a restore, the row whose old value is put back. No bounds here: the server
-- checks them before calling. Security invoker: it runs with its caller's rights, and only the
-- service role may call it.
create function public.admin_set_booster_definition(
  p_slug text,
  p_changes jsonb,
  p_author_id uuid,
  p_restored_from bigint default null
)
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  c_rarities constant text[] := array['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
  v_old public.booster_definitions%rowtype;
  v_new public.booster_definitions%rowtype;
  v_rarity text;
  v_chance numeric;
  v_field text;
  v_before jsonb;
  v_after jsonb;
  v_change_id bigint;
begin
  -- Every booster, not only this one: the rules below read the others, which two deactivations
  -- at the same moment would otherwise each see still available. The lock conflicts with itself
  -- and with plain writes; an opening's FOR SHARE goes on, and the update below waits for it.
  lock table public.booster_definitions in share row exclusive mode;

  select b.* into v_old
  from public.booster_definitions b
  where b.slug = p_slug;

  if not found then
    raise exception 'unknown_booster';
  end if;

  v_new := v_old;
  v_new.cost_coins := coalesce((p_changes ->> 'cost_coins')::numeric, v_old.cost_coins);
  v_new.slots := coalesce((p_changes ->> 'slots')::integer, v_old.slots);
  v_new.shop_weight := coalesce((p_changes ->> 'shop_weight')::numeric, v_old.shop_weight);
  v_new.is_active := coalesce((p_changes ->> 'is_active')::boolean, v_old.is_active);
  foreach v_rarity in array c_rarities loop
    v_chance := (p_changes -> 'rarity_weights' ->> v_rarity)::numeric;
    -- A rarity not given (null) keeps its chance, and so does one given at its current chance.
    if v_chance <> coalesce((v_old.rarity_weights ->> v_rarity)::numeric, 0) then
      v_new.rarity_weights := v_new.rarity_weights || jsonb_build_object(v_rarity, v_chance);
    end if;
  end loop;

  update public.booster_definitions b
  set
    cost_coins = v_new.cost_coins,
    slots = v_new.slots,
    shop_weight = v_new.shop_weight,
    is_active = v_new.is_active,
    rarity_weights = v_new.rarity_weights,
    updated_at = now()
  where b.id = v_old.id
    and (b.cost_coins, b.slots, b.shop_weight, b.is_active, b.rarity_weights)
      is distinct from
      (v_new.cost_coins, v_new.slots, v_new.shop_weight, v_new.is_active, v_new.rarity_weights);

  if not found then
    return null;
  end if;

  -- Checked on the boosters as the change leaves them; the exception undoes the update.
  if not exists (
    select 1 from public.booster_definitions b where b.is_active and b.shop_weight > 0
  ) then
    raise exception 'no_available_booster';
  end if;

  if not exists (
    select 1
    from unnest(c_rarities) as r (rarity)
    where (v_new.rarity_weights ->> r.rarity)::numeric > 0
  ) then
    raise exception 'no_positive_chance';
  end if;

  -- One row per changed value, in the card's order, at the same changed_at (now(), the
  -- transaction's start, as updated_at). Numbers without the columns' padding: 450, not 450.0000.
  for v_field, v_before, v_after in
    select c.field, c.before, c.after
    from (
      values
        (0, 'cost_coins', to_jsonb(trim_scale(v_old.cost_coins)),
          to_jsonb(trim_scale(v_new.cost_coins))),
        (1, 'slots', to_jsonb(v_old.slots), to_jsonb(v_new.slots)),
        (2, 'shop_weight', to_jsonb(trim_scale(v_old.shop_weight)),
          to_jsonb(trim_scale(v_new.shop_weight))),
        (3, 'is_active', to_jsonb(v_old.is_active), to_jsonb(v_new.is_active))
      union all
      select 3 + r.position, 'rarity_weights.' || r.rarity,
        coalesce(v_old.rarity_weights -> r.rarity, '0'),
        coalesce(v_new.rarity_weights -> r.rarity, '0')
      from unnest(c_rarities) with ordinality as r (rarity, position)
    ) as c (position, field, before, after)
    where c.before <> c.after
    order by c.position
  loop
    insert into public.admin_setting_changes
      (scope, target, field, old_value, new_value, author_id, restored_from)
    values ('booster_definition', p_slug, v_field, v_before, v_after, p_author_id, p_restored_from)
    returning id into v_change_id;
  end loop;

  return v_change_id;
end;
$$;

-- Changes what every player pays and draws: no grant to visitors nor players, not even to a super
-- administrateur's own session. The server calls it with the service role.
revoke execute on function public.admin_set_booster_definition(text, jsonb, uuid, bigint)
  from public, anon, authenticated;
grant execute on function public.admin_set_booster_definition(text, jsonb, uuid, bigint)
  to service_role;
