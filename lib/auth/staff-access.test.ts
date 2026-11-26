import { describe, expect, it, vi } from "vitest";
import { runStaffAccess } from "@/lib/auth/staff-access";
import type { StaffSession, TeamRole } from "@/lib/auth/staff-session";

// The contract under test, in full:
//   runStaffAccess({ locale, path }, { getUser, readTeamRole })
//     -> { kind: "redirect", to: string }          (to is a site-relative URL)
//      | { kind: "staff", session: StaffSession }  (StaffSession = { id, email, role })
// getUser(): SessionUser | null; readTeamRole(userId): TeamRole | null.

describe("runStaffAccess", () => {
  it("sends a visitor to the login with the requested path as returnTo", async () => {
    const readTeamRole = vi.fn(async () => null);

    const decision = await runStaffAccess(
      { locale: "en", path: "/en/admin/accounts" },
      { getUser: async () => null, readTeamRole },
    );

    expect(decision).toEqual({
      kind: "redirect",
      to: "/en/login?returnTo=%2Fen%2Fadmin%2Faccounts",
    });
    // No session, nothing to look up.
    expect(readTeamRole).not.toHaveBeenCalled();
  });

  it("sends a signed-in player without a team role to the site home", async () => {
    const readTeamRole = vi.fn(async () => null);

    const decision = await runStaffAccess(
      { locale: "en", path: "/en/admin" },
      { getUser: async () => ({ id: "user-1", email: "player@example.test" }), readTeamRole },
    );

    expect(decision).toEqual({ kind: "redirect", to: "/en" });
    expect(readTeamRole).toHaveBeenCalledWith("user-1");
  });

  it("treats a role read that throws as no role and sends the user to the site home", async () => {
    const decision = await runStaffAccess(
      { locale: "en", path: "/en/admin" },
      {
        getUser: async () => ({ id: "user-3", email: "member@example.test" }),
        readTeamRole: async () => {
          throw new Error("database error or missing SUPABASE_SERVICE_ROLE_KEY");
        },
      },
    );

    expect(decision).toEqual({ kind: "redirect", to: "/en" });
  });

  it("gives a team member a staff session with exactly their id, e-mail and role", async () => {
    const role: TeamRole = "moderator";
    const decision = await runStaffAccess(
      { locale: "fr", path: "/fr/admin" },
      {
        getUser: async () => ({ id: "user-2", email: "member@example.test" }),
        readTeamRole: async () => role,
      },
    );

    const session: StaffSession = { id: "user-2", email: "member@example.test", role };
    expect(decision).toEqual({ kind: "staff", session });
  });

  it("sends a moderator to the admin home when the page asks for a super administrator", async () => {
    const decision = await runStaffAccess(
      { locale: "en", path: "/en/admin/settings", role: "super_admin" },
      {
        getUser: async () => ({ id: "user-4", email: "member@example.test" }),
        readTeamRole: async () => "moderator",
      },
    );

    expect(decision).toEqual({ kind: "redirect", to: "/en/admin" });
  });

  it("gives a super administrator exactly their staff session on a page that asks for that role", async () => {
    const decision = await runStaffAccess(
      { locale: "en", path: "/en/admin/settings", role: "super_admin" },
      {
        getUser: async () => ({ id: "user-5", email: "boss@example.test" }),
        readTeamRole: async () => "super_admin",
      },
    );

    const session: StaffSession = { id: "user-5", email: "boss@example.test", role: "super_admin" };
    expect(decision).toEqual({ kind: "staff", session });
  });
});
