import { describe, expect, it, vi } from "vitest";
import { runRestoreSetting, type ChangeToRestore } from "@/lib/admin/restore-setting";
import type { StaffSession } from "@/lib/auth/staff-session";

const superAdmin: StaffSession = { id: "user-1", email: "boss@example.test", role: "super_admin" };

function deps(session: StaffSession | null = superAdmin, change: ChangeToRestore | null = null) {
  return {
    getSession: vi.fn(async () => session),
    readChange: vi.fn(async (): Promise<ChangeToRestore | null> => change),
    writeSetting: vi.fn(async () => undefined),
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
});
