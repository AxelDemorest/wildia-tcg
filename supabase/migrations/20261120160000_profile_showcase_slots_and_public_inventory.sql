-- CYR-93 — six showcase slots on the player profile, public inventory read when
-- the profile is public, retire profiles.featured_card_id.

-- 1. Showcase slots (1–6 per profile; empty slots keep a null card_id).
create table public.profile_showcase_slots (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  slot smallint not null,
  card_id uuid references public.cards (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (profile_id, slot),
  constraint profile_showcase_slots_slot_range check (slot >= 1 and slot <= 6)
);

create unique index profile_showcase_slots_card_unique
  on public.profile_showcase_slots (profile_id, card_id)
  where card_id is not null;

create index profile_showcase_slots_profile_id_idx
  on public.profile_showcase_slots (profile_id);

-- 2. Migrate the former single featured card into slot 1 when present.
insert into public.profile_showcase_slots (profile_id, slot, card_id)
select id, 1, featured_card_id
from public.profiles
where featured_card_id is not null;

-- 3. Drop the featured-card column and its ownership trigger.
drop trigger if exists profiles_featured_card_owned on public.profiles;
drop function if exists public.profiles_check_featured_card();

revoke update on public.profiles from anon, authenticated;
grant update (display_name, bio, is_public, banner_url, updated_at)
  on public.profiles to authenticated;

alter table public.profiles drop column if exists featured_card_id;

-- 4. Ownership: a filled slot must reference a card the profile owns.
create or replace function public.profile_showcase_slots_check_owned()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.card_id is not null and not exists (
    select 1
    from public.user_cards uc
    where uc.user_id = new.profile_id
      and uc.card_id = new.card_id
      and uc.quantity > 0
  ) then
    raise exception 'showcase card is not owned by this user'
      using errcode = 'check_violation';
  end if;
  new.updated_at = now();
  return new;
end;
$$;

create trigger profile_showcase_slots_owned
  before insert or update of card_id, profile_id on public.profile_showcase_slots
  for each row
  execute function public.profile_showcase_slots_check_owned();

-- 5. Clear a slot when the inventory row is deleted (quantity cannot be ≤ 0:
--    user_cards_quantity_positive). SECURITY DEFINER so the clear still runs
--    when the mutating role would not UPDATE showcase via RLS.
create or replace function public.profile_showcase_slots_clear_on_inventory_loss()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profile_showcase_slots
  set card_id = null, updated_at = now()
  where profile_id = old.user_id
    and card_id = old.card_id;
  return old;
end;
$$;

revoke all on function public.profile_showcase_slots_clear_on_inventory_loss()
  from public, anon, authenticated, service_role;

create trigger profile_showcase_slots_on_user_cards_delete
  after delete on public.user_cards
  for each row
  execute function public.profile_showcase_slots_clear_on_inventory_loss();

-- 6. RLS: owner always; visitors and other players when the profile is public.
alter table public.profile_showcase_slots enable row level security;

create policy "profile_showcase_slots_select_own"
  on public.profile_showcase_slots
  for select
  to authenticated
  using (auth.uid() = profile_id);

create policy "profile_showcase_slots_select_public"
  on public.profile_showcase_slots
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = profile_id
        and p.is_public = true
    )
  );

create policy "profile_showcase_slots_insert_own"
  on public.profile_showcase_slots
  for insert
  to authenticated
  with check (auth.uid() = profile_id);

create policy "profile_showcase_slots_update_own"
  on public.profile_showcase_slots
  for update
  to authenticated
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

create policy "profile_showcase_slots_delete_own"
  on public.profile_showcase_slots
  for delete
  to authenticated
  using (auth.uid() = profile_id);

grant select, insert, update, delete on public.profile_showcase_slots to authenticated;
grant select on public.profile_showcase_slots to anon;

-- 7. Public inventory read (ADR 0002 / glossaire Visibilité du classeur).
create policy "user_cards_select_public_profile"
  on public.user_cards
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = user_id
        and p.is_public = true
    )
  );
