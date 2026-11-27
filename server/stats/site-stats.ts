import "server-only";

import { getServerEnv } from "@/lib/env";
import type { SiteStats } from "@/lib/stats/site-stats";
import { createServiceClient } from "@/lib/supabase/admin";

function startOfTodayUtc(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

/**
 * Aggregate counts only. Uses the service role because draw_logs and profiles are
 * owner-scoped under RLS; no row content leaves this function.
 */
export async function getSiteStats(): Promise<SiteStats | null> {
  if (!getServerEnv().SUPABASE_SERVICE_ROLE_KEY) return null;

  const supabase = createServiceClient();
  const [draws, players, species] = await Promise.all([
    supabase
      .from("draw_logs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfTodayUtc()),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("cards").select("id", { count: "exact", head: true }),
  ]);

  if (draws.error || players.error || species.error) return null;

  return {
    boostersOpenedToday: draws.count ?? 0,
    players: players.count ?? 0,
    species: species.count ?? 0,
  };
}
