-- Sprint 2 / TCG-203 — cards catalogue schema

create type public.card_rarity as enum (
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary'
);

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  rarity public.card_rarity not null,
  image_path text,
  farm_rate_base numeric(12, 4) not null default 0,
  stats jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cards_slug_key unique (slug)
);

create index cards_rarity_idx on public.cards (rarity);

create table public.card_translations (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards (id) on delete cascade,
  locale text not null,
  name text not null,
  description text not null default '',
  lore text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint card_translations_card_locale_key unique (card_id, locale),
  constraint card_translations_locale_check check (locale in ('fr', 'en'))
);

create index card_translations_locale_idx on public.card_translations (locale);

alter table public.cards enable row level security;
alter table public.card_translations enable row level security;

create policy "cards_select_public"
  on public.cards
  for select
  to anon, authenticated
  using (true);

create policy "card_translations_select_public"
  on public.card_translations
  for select
  to anon, authenticated
  using (true);
