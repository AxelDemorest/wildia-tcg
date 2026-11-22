import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";
import { runStaffAccess, type StaffAccessDeps } from "@/lib/auth/staff-access";
import type { StaffSession, TeamRole } from "@/lib/auth/staff-session";
import { createServiceClient } from "@/lib/supabase/admin";
import { getUser } from "@/server/auth/require-user";

/**
 * Read with the service role: team_members grants nothing to visitors nor players. A failed read
 * (database error, missing SUPABASE_SERVICE_ROLE_KEY) is logged here, then runStaffAccess refuses
 * access as for no role.
 */
async function readTeamRole(userId: string): Promise<TeamRole | null> {
  try {
    const { data, error } = await createServiceClient()
      .from("team_members")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw new Error(error.message);

    return (data as { role: TeamRole } | null)?.role ?? null;
  } catch (error) {
    console.error(`Team role read failed for user ${userId}; admin access refused.`, error);
    throw error;
  }
}

// Cached per request: the admin layout and its page share one session read and one role read.
const deps: StaffAccessDeps = { getUser: cache(getUser), readTeamRole: cache(readTeamRole) };

/**
 * Every admin page calls this first, with its own path (no query string): a visitor goes to the
 * login, a player without a rôle d’équipe to the site home, before anything is sent.
 */
export async function requireStaff(locale: string, path: string): Promise<StaffSession> {
  const access = await runStaffAccess({ locale, path }, deps);
  if (access.kind === "redirect") redirect(access.to);
  return access.session;
}

/**
 * The admin layout's and metadata's read: the staff session, or null instead of a redirect. A
 * layout does not stop its page from rendering, so redirecting is left to requireStaff in each page.
 */
export async function getStaffSession(locale: string): Promise<StaffSession | null> {
  // The layout's own path: it only shapes the redirect, which is dropped here.
  const access = await runStaffAccess({ locale, path: `/${locale}/admin` }, deps);
  return access.kind === "staff" ? access.session : null;
}
