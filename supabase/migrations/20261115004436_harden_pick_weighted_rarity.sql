-- pick_weighted_rarity calls random() but was declared STABLE, which lets Postgres reuse one
-- result for every row of a query: 400 draws with weights {common: 1, rare: 1} in a single
-- SELECT all came out the same. open_booster_pack is not affected today (it calls the
-- function once per PL/pgSQL loop iteration), but any set-based draw would be.
alter function public.pick_weighted_rarity(jsonb) volatile;

-- Pin search_path (advisor 0011_function_search_path_mutable). The body only uses built-ins
-- and the schema-qualified public.card_rarity.
alter function public.pick_weighted_rarity(jsonb) set search_path = '';
