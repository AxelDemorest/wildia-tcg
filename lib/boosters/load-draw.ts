import { z } from "zod";
import {
  enrichDrawnCards,
  type GetCatalogCard,
  type RevealedCard,
} from "@/lib/boosters/enrich-drawn-cards";
import { parseDrawnCards, type DrawnCard } from "@/lib/boosters/open-result";

/** The draw_logs columns read back to replay an ouverture, with its définition de booster. */
export const DRAW_LOG_COLUMNS = "id, results, booster_definitions ( id, slug )";

export type DrawLog = {
  drawId: string;
  /** null when the définition de booster is no longer readable (RLS hides inactive ones). */
  booster: { id: string; slug: string } | null;
  /** In stored order, a card drawn twice listed twice. */
  cards: DrawnCard[];
};

/** Reads a draw_logs row selected with DRAW_LOG_COLUMNS; throws on an unexpected shape. */
export function parseDrawLog(raw: unknown): DrawLog {
  if (!raw || typeof raw !== "object") throw new Error("Invalid draw log");
  const row = raw as Record<string, unknown>;
  const booster = row.booster_definitions as Record<string, unknown> | null;

  return {
    drawId: String(row.id),
    booster: booster ? { id: String(booster.id), slug: String(booster.slug) } : null,
    cards: parseDrawnCards(row.results),
  };
}

const drawIdSchema = z.guid();

export type LoadDrawDeps = {
  getUserId: () => Promise<string | null>;
  /**
   * The row selected with DRAW_LOG_COLUMNS, or null when the signed-in player has no such draw.
   * Throws when the read itself fails.
   */
  readDraw: (drawId: string) => Promise<unknown>;
  getCatalogCard: GetCatalogCard;
};

export type LoadDrawOutcome =
  | { ok: true; draw: Omit<DrawLog, "cards"> & { cards: RevealedCard[] } }
  | { ok: false; error: "unauthenticated" | "not_found" | "failed" };

/**
 * Loads one of the signed-in player's ouvertures by draw id; dependencies are injected so it runs
 * without Next nor Supabase.
 */
export async function runLoadDraw(
  locale: string,
  drawId: string,
  deps: LoadDrawDeps,
): Promise<LoadDrawOutcome> {
  if (!(await deps.getUserId())) return { ok: false, error: "unauthenticated" };

  // draw_logs ids are uuids: anything else is no draw, and the query would fail instead of
  // finding nothing.
  if (!drawIdSchema.safeParse(drawId).success) return { ok: false, error: "not_found" };

  let row: unknown;
  try {
    row = await deps.readDraw(drawId);
  } catch {
    return { ok: false, error: "failed" };
  }

  // No row (another player's draw, or none at all) and a malformed one both mean no draw to show.
  let draw: DrawLog;
  try {
    draw = parseDrawLog(row);
  } catch {
    return { ok: false, error: "not_found" };
  }

  const cards = await enrichDrawnCards(draw.cards, locale, deps.getCatalogCard);
  return { ok: true, draw: { ...draw, cards } };
}
