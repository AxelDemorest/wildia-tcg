import { describe, expect, it, vi } from "vitest";
import { runSaveSetting } from "@/lib/admin/save-setting";
import type { StaffSession } from "@/lib/auth/staff-session";

const superAdmin: StaffSession = { id: "user-1", email: "boss@example.test", role: "super_admin" };

function deps(session: StaffSession | null = superAdmin) {
  return {
    getSession: vi.fn(async () => session),
    writeSetting: vi.fn(async () => undefined),
    refresh: vi.fn(),
  };
}

describe("runSaveSetting", () => {
  it("writes the value as a number under the super admin's id, then refreshes", async () => {
    const d = deps();

    const result = await runSaveSetting({ setting: "farm_global_multiplier", value: "1.5" }, d);

    expect(d.writeSetting).toHaveBeenCalledTimes(1);
    expect(d.writeSetting).toHaveBeenCalledWith({
      setting: "farm_global_multiplier",
      value: 1.5,
      authorId: "user-1",
      restoredFrom: null,
    });
    expect(d.refresh).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ ok: true });
  });

  it.each([
    ["no session", null],
    ["a moderator", { ...superAdmin, role: "moderator" as const }],
  ])("refuses %s as forbidden, without writing nor refreshing", async (_name, session) => {
    const d = deps(session);

    const result = await runSaveSetting({ setting: "farm_global_multiplier", value: "1.5" }, d);

    expect(result).toEqual({ ok: false, error: "forbidden" });
    expect(d.writeSetting).not.toHaveBeenCalled();
    expect(d.refresh).not.toHaveBeenCalled();
  });

  it("refuses a multiplier out of bounds before writing", async () => {
    const d = deps();

    const result = await runSaveSetting({ setting: "farm_global_multiplier", value: "8" }, d);

    expect(result).toEqual({ ok: false, error: "out_of_range" });
    expect(d.writeSetting).not.toHaveBeenCalled();
    expect(d.refresh).not.toHaveBeenCalled();
  });

  it("refuses a setting the page does not edit as invalid before writing", async () => {
    const d = deps();

    const result = await runSaveSetting({ setting: "booster_shop_window_seconds", value: "60" }, d);

    expect(result).toEqual({ ok: false, error: "invalid" });
    expect(d.writeSetting).not.toHaveBeenCalled();
  });

  it("answers failed, without refreshing, when the write throws", async () => {
    const d = deps();
    d.writeSetting.mockRejectedValueOnce(new Error("database down"));

    const result = await runSaveSetting({ setting: "booster_shop_slot_count", value: "6" }, d);

    expect(result).toEqual({ ok: false, error: "failed" });
    expect(d.refresh).not.toHaveBeenCalled();
  });
});
