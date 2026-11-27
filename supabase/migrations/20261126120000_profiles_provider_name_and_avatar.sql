-- A player who signs up with Google or Discord should land with the name and the picture of
-- that account, not with the e-mail's name part and no picture. handle_new_user now reads them
-- from the provider's data, chosen by raw_app_meta_data ->> 'provider': Supabase Auth sets it,
-- the client cannot (unlike raw_user_meta_data, which an e-mail signup fills freely).
--
-- Name: Google sends the full name as name / full_name. Discord's name is "username#0" for
-- new-style usernames, so it is never used: its display name is custom_claims.global_name
-- (nested, possibly empty), then full_name (the username). Every other provider, e-mail
-- included, keeps the previous rule (display_name sent at signup, else the e-mail's name part).
-- A blank source counts as absent; the result is trimmed and cut to 40 characters, as before.
--
-- Avatar: set only here, at insert (the trigger stays AFTER INSERT, so a later update of the
-- Auth row, e.g. a new picture at each sign-in, never overwrites a custom avatar), and only for
-- Google and Discord. An e-mail signup chooses its own metadata, so it never gets one. Discord's
-- generic default avatar is dropped so the site's default avatar shows instead. Any value that
-- is not an https URL becomes null here: a CHECK on avatar_url would fail the whole auth.users
-- insert, that is the signup itself.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_provider text := new.raw_app_meta_data ->> 'provider';
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_name text := btrim(left(btrim(coalesce(
    case v_provider
      when 'google' then coalesce(
        nullif(btrim(v_meta ->> 'name'), ''),
        nullif(btrim(v_meta ->> 'full_name'), '')
      )
      when 'discord' then coalesce(
        nullif(btrim(v_meta -> 'custom_claims' ->> 'global_name'), ''),
        nullif(btrim(v_meta ->> 'full_name'), '')
      )
      else nullif(btrim(v_meta ->> 'display_name'), '')
    end,
    split_part(new.email, '@', 1)
  )), 40));
  v_locale text := v_meta ->> 'locale';
  v_avatar text := case
    when v_provider in ('google', 'discord')
      then coalesce(nullif(btrim(v_meta ->> 'picture'), ''), nullif(btrim(v_meta ->> 'avatar_url'), ''))
  end;
begin
  if v_avatar is null
    or v_avatar !~ '^https://'
    or v_avatar like 'https://cdn.discordapp.com/embed/avatars/%' then
    v_avatar := null;
  end if;

  insert into public.profiles (id, display_name, avatar_url, locale)
  values (
    new.id,
    nullif(v_name, ''),
    v_avatar,
    case when v_locale in ('fr', 'en') then v_locale else 'fr' end
  );
  return new;
end;
$$;
