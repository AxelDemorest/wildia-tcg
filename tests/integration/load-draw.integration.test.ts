/**
 * Loading one of the player's own past openings by draw id (CYR-79): the player's signed-in
 * client reads draw_logs with DRAW_LOG_COLUMNS, and parseDrawLog reads the row.
 * Runs against the local Supabase: npm run test:integration.
 */
import { afterAll, describe, expect, it } from "vitest";
import { DRAW_LOG_COLUMNS, parseDrawLog } from "@/lib/boosters/load-draw";
import {
  admin,
  cleanup,
  createBooster,
  createCard,
  createPlayer,
  drawsOf,
  giveCoins,
} from "./supabase";

afterAll(cleanup);

describe("loading a draw by id", () => {
  it("reads back the player's own draw: cards in stored order and the booster's id and slug", async () => {
    const player = await createPlayer();
    await giveCoins(player.id, 1000);
    await createCard("rare");
    const boosterId = await createBooster({ rare: 1 }, 100, true, 5, 0);
    const { data: boosterRow, error: boosterError } = await admin
      .from("booster_definitions")
      .select("slug")
      .eq("id", boosterId)
      .single();
    if (boosterError) throw boosterError;

    const { data: opened, error: openError } = await admin.rpc("open_booster_pack", {
      p_booster_id: boosterId,
      p_user_id: player.id,
    });
    if (openError) throw openError;
    const drawId = (opened as { draw_id: string }).draw_id;
    const [stored] = await drawsOf(player.id);

    const { data: row, error } = await player.client
      .from("draw_logs")
      .select(DRAW_LOG_COLUMNS)
      .eq("id", drawId)
      .maybeSingle();
    expect(error).toBeNull();
    const draw = parseDrawLog(row);

    expect(draw.drawId).toBe(drawId);
    expect(draw.booster).toEqual({ id: boosterId, slug: boosterRow.slug });
    expect(draw.cards).toHaveLength(5);
    expect(draw.cards).toEqual(
      (stored.results as { card_id: string; slug: string; rarity: string }[]).map((card) => ({
        cardId: card.card_id,
        slug: card.slug,
        rarity: card.rarity,
      })),
    );
  });

  it("still reads the draw once its booster is deactivated: the booster embed is null, the cards stay", async () => {
    const player = await createPlayer();
    await giveCoins(player.id, 1000);
    await createCard("rare");
    const boosterId = await createBooster({ rare: 1 }, 100, true, 5, 0);

    const { data: opened, error: openError } = await admin.rpc("open_booster_pack", {
      p_booster_id: boosterId,
      p_user_id: player.id,
    });
    if (openError) throw openError;
    const drawId = (opened as { draw_id: string }).draw_id;
    const [stored] = await drawsOf(player.id);

    const { error: deactivateError } = await admin
      .from("booster_definitions")
      .update({ is_active: false })
      .eq("id", boosterId);
    if (deactivateError) throw deactivateError;

    const { data: row, error } = await player.client
      .from("draw_logs")
      .select(DRAW_LOG_COLUMNS)
      .eq("id", drawId)
      .maybeSingle();
    expect(error).toBeNull();
    expect(row).not.toBeNull();
    expect((row as { booster_definitions: unknown }).booster_definitions).toBeNull();
    const draw = parseDrawLog(row);

    expect(draw.drawId).toBe(drawId);
    expect(draw.booster).toBeNull();
    expect(draw.cards).toEqual(
      (stored.results as { card_id: string; slug: string; rarity: string }[]).map((card) => ({
        cardId: card.card_id,
        slug: card.slug,
        rarity: card.rarity,
      })),
    );
  });
});
