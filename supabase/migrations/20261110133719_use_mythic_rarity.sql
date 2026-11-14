-- Use mythic rarity for EW cards and include it in weighted draws.

create or replace function public.pick_weighted_rarity(p_weights jsonb)
returns public.card_rarity
language plpgsql
stable
as $$
declare
  v_order text[] := array['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
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

  return 'mythic';
end;
$$;

update public.cards
set
  rarity = 'mythic',
  farm_rate_base = 0.055556,
  updated_at = now()
where iucn_status = 'EW';
