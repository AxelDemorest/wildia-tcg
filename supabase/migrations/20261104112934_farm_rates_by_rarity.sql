-- Farm per copy: 1, 2, 4, 10, 20 coins/hour, stored as coins/second.

alter table public.cards
  alter column farm_rate_base type numeric(14, 6);

update public.cards
set
  farm_rate_base = case rarity
    when 'common' then 0.000278
    when 'uncommon' then 0.000556
    when 'rare' then 0.001111
    when 'epic' then 0.002778
    when 'legendary' then 0.005556
  end,
  updated_at = now();
