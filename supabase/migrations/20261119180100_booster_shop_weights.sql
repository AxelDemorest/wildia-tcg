-- Product weights of the offre boutique. They are relative: with 70 / 30, a premium booster
-- shows up in about 3 emplacements out of 10.
update public.booster_definitions set shop_weight = 70 where slug = 'standard';
update public.booster_definitions set shop_weight = 30 where slug = 'premium';
