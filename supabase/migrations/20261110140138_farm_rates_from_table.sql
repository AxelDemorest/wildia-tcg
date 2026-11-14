-- Farm per copy from design table (coins/hour → coins/second).

update public.cards
set
  farm_rate_base = case rarity
    when 'common' then 0.001158
    when 'uncommon' then 0.001736
    when 'rare' then 0.002606
    when 'epic' then 0.004050
    when 'legendary' then 0.006367
    when 'mythic' then 0.009839
  end,
  updated_at = now();
