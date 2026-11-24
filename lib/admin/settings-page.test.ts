import { describe, expect, it, vi } from "vitest";
import {
  runLoadSettings,
  SETTINGS_HISTORY_LIMIT,
  type SettingChangeRecord,
} from "@/lib/admin/settings-page";
import type { StaffSession } from "@/lib/auth/staff-session";

const superAdmin: StaffSession = { id: "user-1", email: "boss@example.test", role: "super_admin" };

// A row as the history table holds it (snake_case, ISO dates), newest first.
const rows: SettingChangeRecord[] = [
  {
    id: 12,
    scope: "economy_config",
    target: "farm_global_multiplier",
    field: null,
    old_value: 2,
    new_value: 1.2,
    author_id: "user-2",
    changed_at: "2026-11-23T21:05:00+00:00",
    restored_from: 9,
  },
  {
    id: 11,
    scope: "economy_config",
    target: "booster_shop_slot_count",
    field: null,
    old_value: 8,
    new_value: 6,
    author_id: "user-1",
    changed_at: "2026-11-22T09:30:00+00:00",
    restored_from: null,
  },
];

function deps() {
  return {
    readValues: vi.fn(async () => ({ farm_global_multiplier: 1.2, booster_shop_slot_count: 6 })),
    readHistory: vi.fn(async () => rows),
    readAuthorNames: vi.fn(
      async () =>
        new Map<string, string | null>([
          ["user-1", "Chef E2E"],
          ["user-2", "Léa Martin"],
        ]),
    ),
  };
}

describe("runLoadSettings", () => {
  it("reads the 20 latest changes", async () => {
    const d = deps();

    await runLoadSettings(superAdmin, d);

    expect(SETTINGS_HISTORY_LIMIT).toBe(20);
    expect(d.readHistory).toHaveBeenCalledWith(20);
  });

  it("returns the values and the history rows in read order, ready to show", async () => {
    const result = await runLoadSettings(superAdmin, deps());

    expect(result).toEqual({
      kind: "loaded",
      values: { farm_global_multiplier: 1.2, booster_shop_slot_count: 6 },
      history: [
        {
          id: 12,
          setting: "farm_global_multiplier",
          before: 2,
          after: 1.2,
          author: { kind: "member", name: "Léa Martin" },
          changedAt: "2026-11-23T21:05:00+00:00",
          isRestore: true,
        },
        {
          id: 11,
          setting: "booster_shop_slot_count",
          before: 8,
          after: 6,
          author: { kind: "member", name: "Chef E2E" },
          changedAt: "2026-11-22T09:30:00+00:00",
          isRestore: false,
        },
      ],
    });
  });

  it("answers forbidden to a moderator, reading nothing", async () => {
    const d = deps();

    const result = await runLoadSettings({ ...superAdmin, role: "moderator" }, d);

    expect(result).toEqual({ kind: "forbidden" });
    expect(d.readValues).not.toHaveBeenCalled();
    expect(d.readHistory).not.toHaveBeenCalled();
    expect(d.readAuthorNames).not.toHaveBeenCalled();
  });

  it("tells a deleted account from a member without a display name", async () => {
    const d = deps();
    d.readHistory.mockResolvedValue([
      { ...rows[0], id: 3, author_id: null },
      { ...rows[1], id: 2, author_id: "user-3" },
    ]);
    d.readAuthorNames.mockResolvedValue(new Map([["user-3", null]]));

    const result = await runLoadSettings(superAdmin, d);

    expect(result.kind).toBe("loaded");
    if (result.kind !== "loaded") return;
    expect(result.history.map((change) => change.author)).toEqual([
      { kind: "deleted" },
      { kind: "member", name: null },
    ]);
  });

  it("asks for the names of each author once, leaving out deleted accounts", async () => {
    const d = deps();
    d.readHistory.mockResolvedValue([
      { ...rows[0], id: 4, author_id: "user-1" },
      { ...rows[0], id: 3, author_id: "user-2" },
      { ...rows[1], id: 2, author_id: "user-1" },
      { ...rows[1], id: 1, author_id: null },
    ]);

    await runLoadSettings(superAdmin, d);

    expect(d.readAuthorNames).toHaveBeenCalledTimes(1);
    const [ids] = d.readAuthorNames.mock.calls[0] as unknown as [string[]];
    expect([...ids].sort()).toEqual(["user-1", "user-2"]);
  });

  it("does not ask for any name when the history is empty", async () => {
    const d = deps();
    d.readHistory.mockResolvedValue([]);

    const result = await runLoadSettings(superAdmin, d);

    expect(d.readAuthorNames).not.toHaveBeenCalled();
    expect(result).toEqual({
      kind: "loaded",
      values: { farm_global_multiplier: 1.2, booster_shop_slot_count: 6 },
      history: [],
    });
  });

  it("shows a member without a display name when the names map lacks the author", async () => {
    const d = deps();
    d.readAuthorNames.mockResolvedValue(new Map());

    const result = await runLoadSettings(superAdmin, d);

    expect(result.kind).toBe("loaded");
    if (result.kind !== "loaded") return;
    expect(result.history.map((change) => change.author)).toEqual([
      { kind: "member", name: null },
      { kind: "member", name: null },
    ]);
  });

  it.each(["readValues", "readAuthorNames"] as const)(
    "answers failed when %s rejects",
    async (name) => {
      const d = deps();
      d[name].mockRejectedValue(new Error("database down"));

      const result = await runLoadSettings(superAdmin, d);

      expect(result).toEqual({ kind: "failed" });
    },
  );
});
