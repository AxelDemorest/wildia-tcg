-- The vitrine (open_booster_shop_slot) is now the only way for a player to open a booster:
-- they open an emplacement of their offre boutique, never a pack picked by id.
-- open_booster_pack(uuid, uuid) stays for server use (service role); players can no longer call
-- it through the Data API.
--
-- anon lost its EXECUTE in 20261115001329_restrict_rpc_execute.sql. The statement also lists
-- public so no default grant can leave the function reachable by inheritance.

revoke execute on function public.open_booster_pack(uuid, uuid) from public, anon, authenticated;
