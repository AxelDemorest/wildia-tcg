-- Boutique boosters: each offre now holds 8 emplacements (2 rows of 4), instead of 6.
-- Only the configured value changes; the offre RPC reads it at each call.

insert into public.economy_config (key, value, description)
values (
  'booster_shop_slot_count',
  8,
  'Nombre d’emplacements de chaque offre boutique (boutique boosters).'
)
on conflict (key) do update set value = excluded.value;
