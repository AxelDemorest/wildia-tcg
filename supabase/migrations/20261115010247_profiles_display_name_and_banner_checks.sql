-- Players write display_name and banner_url through the Data API directly (column grants of
-- 20261114235221_protect_profiles_and_ledger), so the limits the profile page checks must also
-- hold in the database. bio already has profiles_bio_length (500 characters).

-- The profile created at signup must fit too. handle_new_user took display_name from the
-- signup metadata (sent by the client, any length) or from the e-mail's name part, which can
-- exceed 40 characters: with the constraint below, such signups would fail. It now trims,
-- falls back to the e-mail when the name sent is blank, and cuts to 40 characters. The
-- locale also comes from the client, so only the site's languages are kept.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := btrim(left(btrim(coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
    split_part(new.email, '@', 1)
  )), 40));
  v_locale text := new.raw_user_meta_data ->> 'locale';
begin
  insert into public.profiles (id, display_name, locale)
  values (
    new.id,
    nullif(v_name, ''),
    case when v_locale in ('fr', 'en') then v_locale else 'fr' end
  );
  return new;
end;
$$;

-- Bring existing rows in line first, the way handle_new_user now does, so adding the
-- constraints cannot fail on a profile created before them (e.g. from a long e-mail).
update public.profiles
set display_name = nullif(btrim(left(btrim(display_name), 40)), '')
where display_name is not null and char_length(btrim(display_name)) not between 1 and 40;

update public.profiles
set banner_url = null
where banner_url is not null and banner_url !~ ('^' || id::text || '/banner\.(png|jpg|webp)$');

-- Same rule as the profile form: 1 to 40 characters once trimmed, or no name.
alter table public.profiles
  add constraint profiles_display_name_length
  check (display_name is null or char_length(btrim(display_name)) between 1 and 40);

-- The banner is the player's own uploaded file, as server/profiles/upload-banner.ts names it
-- ({user id}/banner.{png|jpg|webp} in the profile-banners bucket): not another player's file,
-- not a path that climbs out of the folder, not an outside URL.
alter table public.profiles
  add constraint profiles_banner_url_own_file
  check (banner_url is null or banner_url ~ ('^' || id::text || '/banner\.(png|jpg|webp)$'));
