import { describe, expect, it, vi } from "vitest";
import { formatIndicator, runAdminHome } from "@/lib/admin/home-indicators";
import type { StaffSession } from "@/lib/auth/staff-session";

// The contract under test, in full:
//   runAdminHome(session: StaffSession, { countAccounts, countSignupsSince, countTeamMembers, now })
//     -> { role, indicators: { accounts, signups, teamMembers } }   (each number | null)
//   countAccounts(), countTeamMembers(): Promise<number>; countSignupsSince(sinceIso): Promise<number>
//   now(): Date.
//   A counter that rejects leaves only its own indicator at null.
//   formatIndicator(value: number | null, locale: "fr" | "en"): string, "—" for null.

const NOW = new Date("2026-11-22T10:30:00.000Z");
const session: StaffSession = { id: "user-1", email: "mod@example.test", role: "moderator" };

function deps(overrides: Partial<Parameters<typeof runAdminHome>[1]> = {}) {
  return {
    countAccounts: async () => 1284,
    countSignupsSince: async () => 96,
    countTeamMembers: async () => 4,
    now: () => NOW,
    ...overrides,
  };
}

describe("runAdminHome", () => {
  it("returns each count in its own indicator, with the member's role", async () => {
    const result = await runAdminHome(session, deps());

    expect(result).toEqual({
      role: "moderator",
      indicators: { accounts: 1284, signups: 96, teamMembers: 4 },
    });
  });

  it("counts sign-ups from exactly 7 x 24 hours before now", async () => {
    const countSignupsSince = vi.fn(async (sinceIso: string) => (sinceIso ? 96 : 0));

    await runAdminHome(session, deps({ countSignupsSince }));

    expect(countSignupsSince).toHaveBeenCalledTimes(1);
    expect(countSignupsSince).toHaveBeenCalledWith("2026-11-15T10:30:00.000Z");
  });

  it.each([
    ["countAccounts", { accounts: null, signups: 0, teamMembers: 3 }],
    ["countSignupsSince", { accounts: 12, signups: null, teamMembers: 3 }],
    ["countTeamMembers", { accounts: 12, signups: 0, teamMembers: null }],
  ] as const)("leaves only the indicator of a failing %s empty", async (failing, expected) => {
    const reject = async () => {
      throw new Error("database unavailable");
    };

    const result = await runAdminHome(
      session,
      deps({
        countAccounts: async () => 12,
        countSignupsSince: async () => 0,
        countTeamMembers: async () => 3,
        [failing]: reject,
      }),
    );

    expect(result.indicators).toEqual(expected);
    expect(result.role).toBe("moderator");
  });
});

describe("formatIndicator", () => {
  it.each([
    ["fr", 1284, "1 284"],
    ["en", 1284, "1,284"],
  ] as const)("formats a count for the %s locale", (locale, value, expected) => {
    expect(formatIndicator(value, locale)).toBe(expected);
  });

  it.each([
    [null, "—"],
    [0, "0"],
  ] as const)("shows %s as %j", (value, expected) => {
    expect(formatIndicator(value, "fr")).toBe(expected);
  });
});
