import { describe, expect, it, vi } from "vitest";
import { runGrantCoins } from "@/lib/admin/grant-coins";
import type { StaffSession } from "@/lib/auth/staff-session";

const superAdmin: StaffSession = { id: "user-1", email: "boss@example.test", role: "super_admin" };

const TARGET = "7b0f4f0e-5d57-4b43-9a53-1d7a6c3f2a10";

function deps(session: StaffSession | null = superAdmin) {
  return {
    getSession: vi.fn(async () => session),
    writeGrant: vi.fn(async () => undefined),
    refresh: vi.fn(),
  };
}

// What the dialog sends: the target and the amount as the form holds them.
const form: { userId: unknown; amount: unknown; reason?: unknown } = {
  userId: TARGET,
  amount: "500",
};

describe("runGrantCoins", () => {
  it("writes the amount typed, for the target, under the super admin's id, with no reason", async () => {
    const d = deps();

    const result = await runGrantCoins(form, d);

    expect(d.writeGrant).toHaveBeenCalledTimes(1);
    expect(d.writeGrant).toHaveBeenCalledWith({
      userId: TARGET,
      amount: 500,
      reason: null,
      authorId: "user-1",
    });
    expect(d.refresh).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ ok: true });
  });

  it.each([
    ["no session", null],
    ["a moderator", { ...superAdmin, role: "moderator" as const }],
  ])("refuses %s as forbidden, without writing", async (_name, session) => {
    const d = deps(session);

    const result = await runGrantCoins(form, d);

    expect(result).toEqual({ ok: false, error: "forbidden" });
    expect(d.writeGrant).not.toHaveBeenCalled();
    expect(d.refresh).not.toHaveBeenCalled();
  });

  it.each(["1", "9999999999"])("writes the amount %s as a number", async (amount) => {
    const d = deps();

    const result = await runGrantCoins({ ...form, amount }, d);

    expect(result).toEqual({ ok: true });
    expect(d.writeGrant).toHaveBeenCalledTimes(1);
    expect(d.writeGrant).toHaveBeenCalledWith(expect.objectContaining({ amount: Number(amount) }));
  });

  it.each([
    ["0", "0"],
    ["one above the ledger's limit", "10000000000"],
  ])("refuses %s as an amount out of range, without writing", async (_name, amount) => {
    const d = deps();

    const result = await runGrantCoins({ ...form, amount }, d);

    expect(result).toEqual({
      ok: false,
      error: "invalid_values",
      fields: { amount: "out_of_range" },
    });
    expect(d.writeGrant).not.toHaveBeenCalled();
    expect(d.refresh).not.toHaveBeenCalled();
  });

  it.each([
    ["absent", undefined],
    ["a number", 42],
    ["null", null],
    ["an empty string", ""],
    ["not an UUID", "not-a-uuid"],
    ["an UUID with a character too many", `${TARGET}0`],
  ])("refuses a userId that is %s as invalid, without writing", async (_name, userId) => {
    const d = deps();

    const result = await runGrantCoins({ ...form, userId }, d);

    expect(result).toEqual({ ok: false, error: "invalid" });
    expect(d.writeGrant).not.toHaveBeenCalled();
    expect(d.refresh).not.toHaveBeenCalled();
  });

  it("reports an account that no longer exists as unknown_account", async () => {
    const d = deps();
    d.writeGrant.mockRejectedValue(new Error("unknown_account"));

    const result = await runGrantCoins(form, d);

    expect(result).toEqual({ ok: false, error: "unknown_account" });
    expect(d.refresh).not.toHaveBeenCalled();
  });

  it.each([
    ["a database error", new Error("connection refused")],
    ["an error that only mentions the account", new Error("unknown_account_extra")],
  ])("reports %s as failed", async (_name, rejection) => {
    const d = deps();
    d.writeGrant.mockRejectedValue(rejection);

    const result = await runGrantCoins(form, d);

    expect(result).toEqual({ ok: false, error: "failed" });
    expect(d.refresh).not.toHaveBeenCalled();
  });

  describe("reason", () => {
    it.each([
      ["absent", undefined],
      ["null", null],
      ["empty", ""],
      ["blank", "   "],
    ])("passes no reason when it is %s", async (_name, reason) => {
      const d = deps();

      const result = await runGrantCoins({ ...form, reason }, d);

      expect(result).toEqual({ ok: true });
      expect(d.writeGrant).toHaveBeenCalledWith(expect.objectContaining({ reason: null }));
    });

    it("trims the spaces around the reason", async () => {
      const d = deps();

      await runGrantCoins({ ...form, reason: "  Gagnant du concours  " }, d);

      expect(d.writeGrant).toHaveBeenCalledWith(
        expect.objectContaining({ reason: "Gagnant du concours" }),
      );
    });

    it("accepts a reason of 200 characters, spaces around it not counted", async () => {
      const d = deps();
      const reason = "a".repeat(200);

      const result = await runGrantCoins({ ...form, reason: `  ${reason}  ` }, d);

      expect(result).toEqual({ ok: true });
      expect(d.writeGrant).toHaveBeenCalledWith(expect.objectContaining({ reason }));
    });

    it("refuses a reason of 201 characters as too long, without writing", async () => {
      const d = deps();

      const result = await runGrantCoins({ ...form, reason: "a".repeat(201) }, d);

      expect(result).toEqual({
        ok: false,
        error: "invalid_values",
        fields: { reason: "too_long" },
      });
      expect(d.writeGrant).not.toHaveBeenCalled();
      expect(d.refresh).not.toHaveBeenCalled();
    });

    it("counts an emoji as one character, 200 of them fitting", async () => {
      const accepted = deps();

      const fits = await runGrantCoins({ ...form, reason: "😀".repeat(200) }, accepted);

      expect(fits).toEqual({ ok: true });
      expect(accepted.writeGrant).toHaveBeenCalledWith(
        expect.objectContaining({ reason: "😀".repeat(200) }),
      );
    });

    it("reports an invalid amount and a reason too long together", async () => {
      const d = deps();

      const result = await runGrantCoins({ ...form, amount: "0", reason: "a".repeat(300) }, d);

      expect(result).toEqual({
        ok: false,
        error: "invalid_values",
        fields: { amount: "out_of_range", reason: "too_long" },
      });
      expect(d.writeGrant).not.toHaveBeenCalled();
      expect(d.refresh).not.toHaveBeenCalled();
    });
  });
});
