import { describe, expect, it, vi } from "vitest";
import { runSaveBooster } from "@/lib/admin/save-booster";
import type { StaffSession } from "@/lib/auth/staff-session";

const superAdmin: StaffSession = { id: "user-1", email: "boss@example.test", role: "super_admin" };

function deps(session: StaffSession | null = superAdmin) {
  return {
    getSession: vi.fn(async () => session),
    writeBooster: vi.fn(async () => undefined),
    refresh: vi.fn(),
  };
}

// What the Premium card sends: every value as the form holds it, the price changed.
const form = {
  slug: "premium",
  costCoins: "450",
  slots: "5",
  shopWeight: "30",
  isActive: true,
  rarityWeights: {
    common: "0",
    uncommon: "20",
    rare: "10",
    epic: "5",
    legendary: "2",
    mythic: "0",
  },
};

describe("runSaveBooster", () => {
  it("writes the card's values typed, under the super admin's id, then refreshes", async () => {
    const d = deps();

    const result = await runSaveBooster(form, d);

    expect(d.writeBooster).toHaveBeenCalledTimes(1);
    expect(d.writeBooster).toHaveBeenCalledWith({
      slug: "premium",
      changes: {
        cost_coins: 450,
        slots: 5,
        shop_weight: 30,
        is_active: true,
        rarity_weights: { common: 0, uncommon: 20, rare: 10, epic: 5, legendary: 2, mythic: 0 },
      },
      authorId: "user-1",
      restoredFrom: null,
    });
    expect(d.refresh).toHaveBeenCalledTimes(1);
    expect(d.writeBooster.mock.invocationCallOrder[0]).toBeLessThan(
      d.refresh.mock.invocationCallOrder[0],
    );
    expect(result).toEqual({ ok: true });
  });

  it.each([
    ["no session", null],
    ["a moderator", { ...superAdmin, role: "moderator" as const }],
  ])("refuses %s as forbidden, without writing nor refreshing", async (_name, session) => {
    const d = deps(session);

    const result = await runSaveBooster(form, d);

    expect(result).toEqual({ ok: false, error: "forbidden" });
    expect(d.writeBooster).not.toHaveBeenCalled();
    expect(d.refresh).not.toHaveBeenCalled();
  });

  it("refuses a price out of bounds as an error of the price field, writing nothing", async () => {
    const d = deps();

    const result = await runSaveBooster({ ...form, costCoins: "0" }, d);

    expect(result).toEqual({
      ok: false,
      error: "invalid_values",
      fields: { costCoins: "out_of_range" },
    });
    expect(d.writeBooster).not.toHaveBeenCalled();
    expect(d.refresh).not.toHaveBeenCalled();
  });

  it("refuses a slug that is not a string as invalid, writing nothing", async () => {
    const d = deps();

    const result = await runSaveBooster({ ...form, slug: 42 }, d);

    expect(result).toEqual({ ok: false, error: "invalid" });
    expect(d.writeBooster).not.toHaveBeenCalled();
    expect(d.refresh).not.toHaveBeenCalled();
  });

  // The database refuses with an error whose message is the code (an exception it raises).
  it.each(["no_available_booster", "no_positive_chance"] as const)(
    "answers %s, not failed, without refreshing, when the database refuses the change",
    async (code) => {
      const d = deps();
      d.writeBooster.mockRejectedValueOnce(new Error(code));

      const result = await runSaveBooster(form, d);

      expect(result).toEqual({ ok: false, error: code });
      expect(d.refresh).not.toHaveBeenCalled();
    },
  );

  it("answers failed, without refreshing, when the write throws", async () => {
    const d = deps();
    d.writeBooster.mockRejectedValueOnce(new Error("database down"));

    const result = await runSaveBooster(form, d);

    expect(result).toEqual({ ok: false, error: "failed" });
    expect(d.refresh).not.toHaveBeenCalled();
  });
});
