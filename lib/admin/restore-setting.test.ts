import { describe, expect, it, vi } from "vitest";
import { runRestoreSetting, type ChangeToRestore } from "@/lib/admin/restore-setting";
import type { BoosterField } from "@/lib/admin/booster-values";
import type { StaffSession } from "@/lib/auth/staff-session";

const superAdmin: StaffSession = { id: "user-1", email: "boss@example.test", role: "super_admin" };

function deps(session: StaffSession | null = superAdmin, change: ChangeToRestore | null = null) {
  return {
    getSession: vi.fn(async () => session),
    readChange: vi.fn(async (): Promise<ChangeToRestore | null> => change),
    writeSetting: vi.fn(async () => undefined),
    writeBooster: vi.fn(async () => undefined),
    refresh: vi.fn(),
  };
}

const multiplierRow: ChangeToRestore = { id: 42, setting: "farm_global_multiplier", before: 1 };

describe("runRestoreSetting", () => {
  it("writes the row's Avant under the super admin's id, pointing at that row, then refreshes", async () => {
    const d = deps(superAdmin, multiplierRow);

    const result = await runRestoreSetting({ changeId: "42" }, d);

    expect(d.readChange).toHaveBeenCalledWith(42);
    expect(d.writeSetting).toHaveBeenCalledTimes(1);
    expect(d.writeSetting).toHaveBeenCalledWith({
      setting: "farm_global_multiplier",
      value: 1,
      authorId: "user-1",
      restoredFrom: 42,
    });
    expect(d.refresh).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ ok: true });
  });

  it.each([
    ["no session", null],
    ["a moderator", { ...superAdmin, role: "moderator" as const }],
  ])("refuses %s as forbidden, reading and writing nothing", async (_name, session) => {
    const d = deps(session, multiplierRow);

    const result = await runRestoreSetting({ changeId: "42" }, d);

    expect(result).toEqual({ ok: false, error: "forbidden" });
    expect(d.readChange).not.toHaveBeenCalled();
    expect(d.writeSetting).not.toHaveBeenCalled();
    expect(d.refresh).not.toHaveBeenCalled();
  });

  it("refuses a non-integer row id as invalid, reading nothing", async () => {
    const d = deps(superAdmin, multiplierRow);

    const result = await runRestoreSetting({ changeId: "1.5" }, d);

    expect(result).toEqual({ ok: false, error: "invalid" });
    expect(d.readChange).not.toHaveBeenCalled();
    expect(d.writeSetting).not.toHaveBeenCalled();
  });

  it("answers failed when the row does not exist, writing nothing", async () => {
    const d = deps(superAdmin, null);

    const result = await runRestoreSetting({ changeId: "42" }, d);

    expect(result).toEqual({ ok: false, error: "failed" });
    expect(d.writeSetting).not.toHaveBeenCalled();
    expect(d.refresh).not.toHaveBeenCalled();
  });

  it("answers failed for a row of a setting this page does not edit, writing nothing", async () => {
    const d = deps(superAdmin, { id: 42, setting: null });

    const result = await runRestoreSetting({ changeId: "42" }, d);

    expect(result).toEqual({ ok: false, error: "failed" });
    expect(d.writeSetting).not.toHaveBeenCalled();
  });

  it("refuses a slot count whose Avant is out of bounds, writing nothing", async () => {
    const d = deps(superAdmin, { id: 42, setting: "booster_shop_slot_count", before: 20 });

    const result = await runRestoreSetting({ changeId: "42" }, d);

    expect(result).toEqual({ ok: false, error: "out_of_range" });
    expect(d.writeSetting).not.toHaveBeenCalled();
    expect(d.refresh).not.toHaveBeenCalled();
  });

  it("answers failed, without refreshing, when the write throws", async () => {
    const d = deps(superAdmin, multiplierRow);
    d.writeSetting.mockRejectedValueOnce(new Error("database down"));

    const result = await runRestoreSetting({ changeId: "42" }, d);

    expect(result).toEqual({ ok: false, error: "failed" });
    expect(d.refresh).not.toHaveBeenCalled();
  });

  it("a failed read of the history row gives failed and writes nothing", async () => {
    const d = deps(superAdmin, multiplierRow);
    d.readChange.mockRejectedValueOnce(new Error("database down"));

    const result = await runRestoreSetting({ changeId: "42" }, d);

    expect(result).toEqual({ ok: false, error: "failed" });
    expect(d.writeSetting).not.toHaveBeenCalled();
    expect(d.refresh).not.toHaveBeenCalled();
  });

  it.each([
    [
      "a price",
      { id: 43, booster: { slug: "premium", field: "cost_coins" }, before: 450 },
      { cost_coins: 450 },
    ],
    [
      "the active flag",
      { id: 43, booster: { slug: "premium", field: "is_active" }, before: false },
      { is_active: false },
    ],
    [
      "the card count",
      { id: 43, booster: { slug: "premium", field: "slots" }, before: 4 },
      { slots: 4 },
    ],
    [
      "the shop weight",
      { id: 43, booster: { slug: "premium", field: "shop_weight" }, before: 30 },
      { shop_weight: 30 },
    ],
    [
      "one rarity's chance",
      { id: 43, booster: { slug: "premium", field: "rarity_weights.rare" }, before: 10 },
      { rarity_weights: { rare: 10 } },
    ],
  ] as [string, ChangeToRestore, Record<string, unknown>][])(
    "writes only the booster field of a row about %s, pointing at that row, then refreshes",
    async (_name, row, changes) => {
      const d = deps(superAdmin, row);

      const result = await runRestoreSetting({ changeId: "43" }, d);

      expect(d.writeBooster).toHaveBeenCalledTimes(1);
      expect(d.writeBooster).toHaveBeenCalledWith({
        slug: "premium",
        changes,
        authorId: "user-1",
        restoredFrom: 43,
      });
      expect(d.writeSetting).not.toHaveBeenCalled();
      expect(d.refresh).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ ok: true });
    },
  );

  it.each([
    ["12 cards", "slots", 12],
    ["a price of 0", "cost_coins", 0],
    ["a shop weight of 1001", "shop_weight", 1001],
    ["a Rare chance of 1001", "rarity_weights.rare", 1001],
    ["a half chance", "rarity_weights.epic", 0.5],
  ] as [string, BoosterField, number][])(
    "refuses a booster row whose Avant is %s as out of range, writing nothing",
    async (_name, field, before) => {
      const d = deps(superAdmin, { id: 43, booster: { slug: "premium", field }, before });

      const result = await runRestoreSetting({ changeId: "43" }, d);

      expect(result).toEqual({ ok: false, error: "out_of_range" });
      expect(d.writeBooster).not.toHaveBeenCalled();
      expect(d.refresh).not.toHaveBeenCalled();
    },
  );

  it("answers failed for a booster row whose Avant is not of its field's kind, writing nothing", async () => {
    const d = deps(superAdmin, {
      id: 43,
      booster: { slug: "premium", field: "cost_coins" },
      before: true,
    });

    const result = await runRestoreSetting({ changeId: "43" }, d);

    expect(result).toEqual({ ok: false, error: "failed" });
    expect(d.writeBooster).not.toHaveBeenCalled();
  });

  it.each(["no_available_booster", "no_positive_chance"] as const)(
    "answers %s, not failed, without refreshing, when the database refuses the restore",
    async (code) => {
      const d = deps(superAdmin, {
        id: 43,
        booster: { slug: "premium", field: "shop_weight" },
        before: 30,
      });
      d.writeBooster.mockRejectedValueOnce(new Error(code));

      const result = await runRestoreSetting({ changeId: "43" }, d);

      expect(result).toEqual({ ok: false, error: code });
      expect(d.refresh).not.toHaveBeenCalled();
    },
  );

  it("answers failed, without refreshing, when the booster write throws", async () => {
    const d = deps(superAdmin, {
      id: 43,
      booster: { slug: "premium", field: "cost_coins" },
      before: 450,
    });
    d.writeBooster.mockRejectedValueOnce(new Error("database down"));

    const result = await runRestoreSetting({ changeId: "43" }, d);

    expect(result).toEqual({ ok: false, error: "failed" });
    expect(d.refresh).not.toHaveBeenCalled();
  });
});
