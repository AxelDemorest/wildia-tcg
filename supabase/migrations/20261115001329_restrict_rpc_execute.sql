-- Supabase's default privileges grant EXECUTE on every new function in public directly to
-- anon, authenticated and service_role. The earlier `revoke all ... from public` only removed
-- the PUBLIC grant, so these functions stayed callable through the Data API
-- (POST /rest/v1/rpc/...), including by visitors who are not signed in:
--
-- - grant_card (SECURITY DEFINER) let anyone add any card, in any quantity, to any account.
-- - sync_user_economy and open_booster_pack treat a call with no auth.uid() as a trusted
--   server call and skip the "your own account" check. A visitor has no auth.uid() either,
--   so they could read any player's balance and open boosters with any player's coins.
--
-- The app calls grant_card with the service role (server/inventory/grant-card.ts), and the
-- other two as the signed-in player (server/economy/sync-balance.ts,
-- server/boosters/open-pack.ts). user_currency_balance and pick_weighted_rarity are only
-- called from those SECURITY DEFINER functions, which run as their owner; unlike the three
-- others, they also kept Postgres' default EXECUTE for PUBLIC, which anon and authenticated
-- inherit.

revoke execute on function public.grant_card(uuid, uuid, integer, text) from anon, authenticated;
revoke execute on function public.sync_user_economy(uuid) from anon;
revoke execute on function public.open_booster_pack(uuid, uuid) from anon;
revoke execute on function public.user_currency_balance(uuid) from public, anon, authenticated;
revoke execute on function public.pick_weighted_rarity(jsonb) from public, anon, authenticated;

-- So the next function a migration adds is not callable through the API by accident:
-- functions created by migrations (role postgres) now start with EXECUTE for their owner and
-- service_role only. When players must call one, grant it explicitly:
--   grant execute on function public.my_function(...) to authenticated;
-- Triggers and SECURITY DEFINER callers do not need the grant. PUBLIC's default is global in
-- Postgres, hence the statement without "in schema".
alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated;
