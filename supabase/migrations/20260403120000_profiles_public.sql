-- Sprint 6 / TCG-602 — public profile fields + RLS

alter table public.profiles
  add column if not exists bio text,
  add column if not exists banner_url text,
  add column if not exists featured_card_id uuid references public.cards (id) on delete set null,
  add column if not exists is_public boolean not null default true;

alter table public.profiles drop constraint if exists profiles_bio_length;
alter table public.profiles
  add constraint profiles_bio_length check (bio is null or char_length(bio) <= 500);

create policy "profiles_select_public"
  on public.profiles
  for select
  to anon, authenticated
  using (is_public = true);
