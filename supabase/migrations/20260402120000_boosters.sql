-- Sprint 5 / TCG-501 — booster definitions & draw logs

create table public.booster_definitions (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  cost_coins numeric(14, 4) not null,
  slots integer not null default 5,
  rarity_weights jsonb not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booster_definitions_slug_key unique (slug),
  constraint booster_definitions_slots_positive check (slots > 0),
  constraint booster_definitions_cost_positive check (cost_coins > 0)
);

create table public.draw_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  booster_id uuid not null references public.booster_definitions (id) on delete restrict,
  results jsonb not null,
  roll_seed text not null,
  created_at timestamptz not null default now()
);

create index draw_logs_user_id_idx on public.draw_logs (user_id, created_at desc);

alter table public.booster_definitions enable row level security;
alter table public.draw_logs enable row level security;

create policy "booster_definitions_select_public"
  on public.booster_definitions
  for select
  to anon, authenticated
  using (is_active = true);

create policy "draw_logs_select_own"
  on public.draw_logs
  for select
  to authenticated
  using (auth.uid() = user_id);

insert into public.booster_definitions (slug, cost_coins, slots, rarity_weights, sort_order)
values
  (
    'standard',
    150,
    5,
    '{"common": 55, "uncommon": 28, "rare": 12, "epic": 4, "legendary": 1}'::jsonb,
    1
  ),
  (
    'premium',
    500,
    5,
    '{"common": 35, "uncommon": 30, "rare": 20, "epic": 10, "legendary": 5}'::jsonb,
    2
  )
on conflict (slug) do update
set
  cost_coins = excluded.cost_coins,
  slots = excluded.slots,
  rarity_weights = excluded.rarity_weights,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();
