-- Paramètres du jeu (espace administration): the historique des paramètres, and the function that
-- changes an economy_config value and records the change in the same transaction. Only the server
-- (service role) reaches either, after checking the staff session; the browser never reads nor
-- writes the history.

-- 1. One row per changed value. scope, target and field name the setting: ('economy_config',
--    'farm_global_multiplier', null) here, ('booster_definition', 'premium', 'cost_coins') for the
--    boosters. Values are JSON scalars, so a boolean stays a boolean. The history is read newest
--    first by id, the order the rows were written in, even within one transaction.
create table public.admin_setting_changes (
  id bigint generated always as identity primary key,
  scope text not null check (scope in ('economy_config', 'booster_definition')),
  target text not null,
  field text,
  old_value jsonb not null,
  new_value jsonb not null,
  -- A row outlives its author's account, without an author.
  author_id uuid references auth.users (id) on delete set null,
  changed_at timestamptz not null default now(),
  -- Set by a restore: the row whose old value it put back.
  restored_from bigint references public.admin_setting_changes (id) on delete set null
);

alter table public.admin_setting_changes enable row level security;

-- No policy on purpose (as team_members): the server reads and writes the history with the
-- service role only, never from the browser, not even a super administrateur's own session.
revoke all on public.admin_setting_changes from anon, authenticated;

-- 2. Sets p_key to p_value for the author p_author_id and adds its history row; if the row cannot
--    be written, the value does not change either. The old value is read here under a row lock,
--    never received: changes arriving at the same moment apply one after the other, each recording
--    the value the previous one left. The current value changes nothing and returns null;
--    otherwise the new row's id. p_restored_from: on a restore, the row whose old value is put back.
--    No bounds here: the server checks them before calling. Security invoker: it runs with its
--    caller's rights, and only the service role may call it.
create function public.admin_set_economy_config(
  p_key text,
  p_value numeric,
  p_author_id uuid,
  p_restored_from bigint default null
)
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_old numeric;
  v_new numeric;
  v_change_id bigint;
begin
  select c.value into v_old
  from public.economy_config c
  where c.key = p_key
  for update;

  if not found then
    raise exception 'unknown_setting';
  end if;

  if v_old = p_value then
    return null;
  end if;

  update public.economy_config c
  set value = p_value, updated_at = now()
  where c.key = p_key
  returning c.value into v_new;

  -- The values without the column's padding: 1.5, not 1.500000.
  insert into public.admin_setting_changes
    (scope, target, old_value, new_value, author_id, restored_from)
  values (
    'economy_config',
    p_key,
    to_jsonb(trim_scale(v_old)),
    to_jsonb(trim_scale(v_new)),
    p_author_id,
    p_restored_from
  )
  returning id into v_change_id;

  return v_change_id;
end;
$$;

-- Changes a value every player gets: no grant to visitors nor players, not even to a super
-- administrateur's own session. The server calls it with the service role.
revoke execute on function public.admin_set_economy_config(text, numeric, uuid, bigint)
  from public, anon, authenticated;
grant execute on function public.admin_set_economy_config(text, numeric, uuid, bigint)
  to service_role;
