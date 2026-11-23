-- Registre des comptes inscrits (espace administration): one page of player accounts, newest
-- first, with how many accounts match the search. The e-mail and the last sign-in live in
-- auth.users, which the API never exposes: the function runs as its owner (security definer) and
-- only the server (service role) may call it. Who may search e-mails, and the masking of e-mails
-- for the viewer role, are decided by the server from the staff session, never here.

create function public.admin_list_accounts(
  p_search text default null,
  p_search_email boolean default false,
  p_limit integer default 50,
  p_offset integer default 0
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with term as (
    -- Anywhere in the text, case ignored; \, % and _ in the search are the characters themselves.
    -- No search (null or empty) lists every account.
    select '%'
      || replace(replace(replace(nullif(p_search, ''), '\', '\\'), '%', '\%'), '_', '\_')
      || '%' as pattern
  ),
  matches as (
    select p.id, p.display_name, u.email, p.created_at, u.last_sign_in_at, p.locale, p.is_public
    from public.profiles p
    join auth.users u on u.id = p.id
    cross join term
    where term.pattern is null
      or p.display_name ilike term.pattern escape '\'
      or (p_search_email and u.email ilike term.pattern escape '\')
  ),
  page as (
    select *
    from matches
    order by created_at desc, id desc
    limit p_limit
    offset p_offset
  )
  select jsonb_build_object(
    -- The whole search's count, even when the page asked for is past the last one.
    'total', (select count(*) from matches),
    'accounts', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', page.id,
            'display_name', page.display_name,
            'email', page.email,
            'signed_up_at', page.created_at,
            'last_sign_in_at', page.last_sign_in_at,
            'locale', page.locale,
            'is_public', page.is_public
          )
          order by page.created_at desc, page.id desc
        )
        from page
      ),
      '[]'::jsonb
    )
  );
$$;

-- Every e-mail is in there: no grant to visitors nor players, not even to a team member's own
-- session. The server reaches it with the service role, after requireStaff.
revoke execute on function public.admin_list_accounts(text, boolean, integer, integer)
  from public, anon, authenticated;
grant execute on function public.admin_list_accounts(text, boolean, integer, integer)
  to service_role;
