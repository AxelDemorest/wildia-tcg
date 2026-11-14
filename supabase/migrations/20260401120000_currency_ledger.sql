-- Sprint 4 / TCG-401 — immutable currency ledger

create type public.currency_movement_type as enum (
  'farm_accrual',
  'booster_purchase',
  'stripe_purchase',
  'admin_adjust'
);

create table public.currency_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount numeric(14, 4) not null,
  type public.currency_movement_type not null,
  reference_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index currency_ledger_user_id_created_idx
  on public.currency_ledger (user_id, created_at desc);

alter table public.currency_ledger enable row level security;

create policy "currency_ledger_select_own"
  on public.currency_ledger
  for select
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.currency_ledger_deny_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'currency_ledger is append-only';
end;
$$;

create trigger currency_ledger_no_update
  before update on public.currency_ledger
  for each row
  execute function public.currency_ledger_deny_mutation();

create trigger currency_ledger_no_delete
  before delete on public.currency_ledger
  for each row
  execute function public.currency_ledger_deny_mutation();

create table public.economy_config (
  key text primary key,
  value numeric(14, 6) not null,
  description text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.economy_config enable row level security;

create policy "economy_config_select_public"
  on public.economy_config
  for select
  to anon, authenticated
  using (true);

insert into public.economy_config (key, value, description)
values (
  'farm_global_multiplier',
  1.0,
  'Multiplicateur appliqué au farm (taux carte × quantité × Δt).'
)
on conflict (key) do nothing;

create or replace function public.user_currency_balance(p_user_id uuid)
returns numeric
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(sum(amount), 0)::numeric
  from public.currency_ledger
  where user_id = p_user_id;
$$;
