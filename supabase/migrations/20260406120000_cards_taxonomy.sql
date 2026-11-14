-- Card taxonomy: scientific name and global IUCN Red List status (shown on cards).

create type public.iucn_status as enum (
  'LC',
  'NT',
  'VU',
  'EN',
  'CR',
  'EW',
  'EX',
  'DD',
  'NE'
);

alter table public.cards
  add column scientific_name text,
  add column iucn_status public.iucn_status;

create unique index cards_scientific_name_key
  on public.cards (lower(scientific_name))
  where scientific_name is not null;
