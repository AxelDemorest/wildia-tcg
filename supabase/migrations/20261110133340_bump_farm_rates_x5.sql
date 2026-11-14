-- Farm per copy: 5, 10, 20, 50, 100 coins/hour, stored as coins/second.

update public.cards
set
  farm_rate_base = case rarity
    when 'common' then 0.001389
    when 'uncommon' then 0.002778
    when 'rare' then 0.005556
    when 'epic' then 0.013889
    when 'legendary' then 0.027778
  end,
  updated_at = now();
