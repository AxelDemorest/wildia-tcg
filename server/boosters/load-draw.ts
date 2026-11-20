import "server-only";

import { DRAW_LOG_COLUMNS, runLoadDraw, type LoadDrawOutcome } from "@/lib/boosters/load-draw";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/server/auth/require-user";
import { getCatalogCardBySlug } from "@/server/cards/queries";

/** Reads with the player's own client: RLS (draw_logs_select_own) hides other players' draws. */
async function readDraw(drawId: string): Promise<unknown> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("draw_logs")
    .select(DRAW_LOG_COLUMNS)
    .eq("id", drawId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return data;
}

/** One of the signed-in player's past ouvertures, cards in drawn order, for a révélation. */
export function loadDrawForReveal(locale: string, drawId: string): Promise<LoadDrawOutcome> {
  return runLoadDraw(locale, drawId, {
    getUserId: async () => (await getUser())?.id ?? null,
    readDraw,
    getCatalogCard: getCatalogCardBySlug,
  });
}
