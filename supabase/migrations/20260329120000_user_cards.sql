-- Sprint 3 / TCG-301 — player inventory

create table public.user_cards (
  user_id uuid not null references auth.users (id) on delete cascade,
  card_id uuid not null references public.cards (id) on delete restrict,
  quantity integer not null default 1,
  acquired_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, card_id),
  constraint user_cards_quantity_positive check (quantity > 0)
);

create index user_cards_user_id_idx on public.user_cards (user_id);

create table public.user_card_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  card_id uuid not null references public.cards (id) on delete restrict,
  quantity integer not null,
  source text not null default 'grant',
  created_at timestamptz not null default now(),
  constraint user_card_grants_quantity_positive check (quantity > 0)
);

create index user_card_grants_user_id_idx on public.user_card_grants (user_id, created_at desc);

alter table public.user_cards enable row level security;
alter table public.user_card_grants enable row level security;

create policy "user_cards_select_own"
  on public.user_cards
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "user_card_grants_select_own"
  on public.user_card_grants
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Writes only via service role (Server Actions) or grant_card RPC.

create or replace function public.grant_card(
  p_user_id uuid,
  p_card_id uuid,
  p_quantity integer default 1,
  p_source text default 'grant'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_quantity is null or p_quantity < 1 then
    raise exception 'quantity must be >= 1';
  end if;

  if not exists (select 1 from public.cards where id = p_card_id) then
    raise exception 'card not found';
  end if;

  insert into public.user_cards (user_id, card_id, quantity)
  values (p_user_id, p_card_id, p_quantity)
  on conflict (user_id, card_id) do update
    set
      quantity = public.user_cards.quantity + excluded.quantity,
      updated_at = now();

  insert into public.user_card_grants (user_id, card_id, quantity, source)
  values (p_user_id, p_card_id, p_quantity, coalesce(p_source, 'grant'));
end;
$$;

revoke all on function public.grant_card (uuid, uuid, integer, text) from public;
grant execute on function public.grant_card (uuid, uuid, integer, text) to service_role;
