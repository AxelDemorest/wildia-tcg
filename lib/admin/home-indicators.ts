import type { AppLocale } from "@/i18n/routing";
import { formatCount } from "@/lib/admin/format-count";
import type { StaffSession, TeamRole } from "@/lib/auth/staff-session";

/** A count of the admin home, or null when it could not be read. */
export type Indicator = number | null;

export type AdminHome = {
  role: TeamRole;
  indicators: { accounts: Indicator; signups: Indicator; teamMembers: Indicator };
};

export type AdminHomeDeps = {
  countAccounts: () => Promise<number>;
  countSignupsSince: (sinceIso: string) => Promise<number>;
  countTeamMembers: () => Promise<number>;
  now: () => Date;
};

const SIGNUP_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const countOrNull = (result: PromiseSettledResult<number>): Indicator =>
  result.status === "fulfilled" ? result.value : null;

/**
 * The home's three counts for a membre équipe. The sign-up window rolls: from exactly 7 x 24 hours
 * before now. A count that fails leaves only its own indicator empty.
 */
export async function runAdminHome(session: StaffSession, deps: AdminHomeDeps): Promise<AdminHome> {
  const since = new Date(deps.now().getTime() - SIGNUP_WINDOW_MS).toISOString();
  const [accounts, signups, teamMembers] = await Promise.allSettled([
    deps.countAccounts(),
    deps.countSignupsSince(since),
    deps.countTeamMembers(),
  ]);

  return {
    role: session.role,
    indicators: {
      accounts: countOrNull(accounts),
      signups: countOrNull(signups),
      teamMembers: countOrNull(teamMembers),
    },
  };
}

/** What an indicator shows: its count for the locale, or a dash when it is unavailable. */
export function formatIndicator(value: Indicator, locale: AppLocale): string {
  return value === null ? "—" : formatCount(value, locale);
}
