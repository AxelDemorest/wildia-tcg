-- EW (extinct in the wild) maps to mythic, above legendary.
-- Enum value must be committed before it can be referenced (separate migration).

alter type public.card_rarity add value if not exists 'mythic' after 'legendary';
