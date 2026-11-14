-- Reset catalogue: remove legacy seeded cards and player holdings before npm run db:seed.

update public.profiles
set featured_card_id = null
where featured_card_id is not null;

delete from public.user_cards;
delete from public.user_card_grants;
delete from public.card_translations;
delete from public.cards;
