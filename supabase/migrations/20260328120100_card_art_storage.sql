-- Sprint 2 / TCG-204 — public bucket for card artwork

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'card-art',
  'card-art',
  true,
  5242880,
  array['image/webp', 'image/png', 'image/jpeg', 'image/svg+xml']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "card_art_public_read"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'card-art');

create policy "card_art_service_insert"
  on storage.objects
  for insert
  to service_role
  with check (bucket_id = 'card-art');

create policy "card_art_service_update"
  on storage.objects
  for update
  to service_role
  using (bucket_id = 'card-art');

create policy "card_art_service_delete"
  on storage.objects
  for delete
  to service_role
  using (bucket_id = 'card-art');
