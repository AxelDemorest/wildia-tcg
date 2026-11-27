import { loginHref } from "@/lib/auth/return-to";
import type { SessionUser } from "@/lib/auth/session-user";
import type { StaffSession, TeamRole } from "@/lib/auth/staff-session";

export type StaffAccessDeps = {
  getUser: () => Promise<SessionUser | null>;
  /** The user's rôle d’équipe, or null when they have none. Throws when the read itself fails. */
  readTeamRole: (userId: string) => Promise<TeamRole | null>;
};

/** `to` is a site-relative URL. */
export type StaffAccess =
  { kind: "redirect"; to: string } | { kind: "staff"; session: StaffSession };

/**
 * Who may open the espace administration at `path`; dependencies are injected so it runs without
 * Next nor Supabase. A visitor signs in first and comes back to `path`; a player without a rôle
 * d’équipe goes to the site home, with no hint that the espace administration exists. A page
 * reserved to one rôle d’équipe (`role`) sends the other membres équipe to the admin home.
 */
export async function runStaffAccess(
  { locale, path, role: requiredRole }: { locale: string; path: string; role?: TeamRole },
  deps: StaffAccessDeps,
): Promise<StaffAccess> {
  const user = await deps.getUser();
  if (!user) {
    return { kind: "redirect", to: loginHref(locale, path) };
  }

  // Fails closed: a read that fails (database error, missing service key) counts as no role.
  const role = await deps.readTeamRole(user.id).catch(() => null);
  if (!role) return { kind: "redirect", to: `/${locale}` };
  if (requiredRole && role !== requiredRole) return { kind: "redirect", to: `/${locale}/admin` };

  return { kind: "staff", session: { id: user.id, email: user.email, role } };
}
