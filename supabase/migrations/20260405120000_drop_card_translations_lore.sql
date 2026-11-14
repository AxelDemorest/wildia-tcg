-- Remove unused lore column (descriptions come from Wikipedia / taxonomy).

alter table public.card_translations drop column if exists lore;
