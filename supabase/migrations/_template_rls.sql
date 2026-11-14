-- Template (ne pas appliquer tel quel) — copier dans une nouvelle migration

-- create table public.example (
--   id uuid primary key default gen_random_uuid(),
--   user_id uuid not null references auth.users (id) on delete cascade,
--   ...
-- );

-- alter table public.example enable row level security;

-- create policy "example_select_own"
--   on public.example for select to authenticated
--   using (auth.uid() = user_id);
