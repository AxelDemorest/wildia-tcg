import "server-only";

import { runAdminHome, type AdminHome } from "@/lib/admin/home-indicators";
import type { StaffSession } from "@/lib/auth/staff-session";
import { createServiceClient } from "@/lib/supabase/admin";

type Table = "profiles" | "team_members";

/**
 * Counts the rows of a table with the service role, those created from `since` on when given. A
 * failure is logged here; runAdminHome then leaves that one indicator empty.
 */
async function countRows(table: Table, since?: string): Promise<number> {
  try {
    let query = createServiceClient().from(table).select("*", { count: "exact", head: true });
    if (since) query = query.gte("created_at", since);
    const { count, error } = await query;
    if (error) throw new Error(error.message);
    return count ?? 0;
  } catch (error) {
    console.error(`Admin home: counting ${table} failed.`, error);
    throw error;
  }
}

/**
 * The admin home's indicators, counted fresh with the service role (profiles and team_members are
 * closed to the browser). The page calls requireStaff first and passes the session it got.
 */
export function loadAdminHome(session: StaffSession): Promise<AdminHome> {
  return runAdminHome(session, {
    countAccounts: () => countRows("profiles"),
    countSignupsSince: (since) => countRows("profiles", since),
    countTeamMembers: () => countRows("team_members"),
    now: () => new Date(),
  });
}
