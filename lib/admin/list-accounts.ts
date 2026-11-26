import { ACCOUNTS_PAGE_SIZE, accountsPageCount } from "@/lib/admin/accounts-pagination";
import { maskEmail } from "@/lib/admin/mask-email";
import type { StaffSession, TeamRole } from "@/lib/auth/staff-session";

/** An account as admin_list_accounts returns it: snake_case, ISO dates. */
type AccountRecord = {
  id: string;
  display_name: string | null;
  /** Null for an account auth.users holds without an e-mail. */
  email: string | null;
  signed_up_at: string;
  last_sign_in_at: string | null;
  locale: string;
  is_public: boolean;
  /** The sum of the account's coin ledger; PostgREST gives a numeric as a string or a number. */
  balance: number | string;
};

/** What admin_list_accounts returns: the accounts of the page asked for, and the search's count. */
export type AccountsPayload = { total: number; accounts: AccountRecord[] };

/** One call to admin_list_accounts; a null `search` lists every account. */
export type AccountsRequest = {
  search: string | null;
  searchEmail: boolean;
  limit: number;
  offset: number;
};

/** What the registry page asks for: a search term ("" for none) and a page, from 1. */
export type AccountsQuery = { search: string; page: number };

/** An account of the registry, as the page shows it. */
export type RegistryAccount = {
  id: string;
  displayName: string | null;
  /**
   * In clear, or masked for a rôle d’équipe that does not see e-mails; null, for every rôle, when
   * the account has none.
   */
  email: string | null;
  signedUpAt: string;
  lastSignInAt: string | null;
  locale: string;
  isPublic: boolean;
  /** The sum of the account's coin ledger at its last calculation; 0 with no movement. */
  balance: number;
};

export type AccountsPage = {
  kind: "page";
  /** Accounts matching the search, on every page. */
  total: number;
  page: number;
  pageCount: number;
  /** True when the rôle d’équipe sees the e-mails of `accounts` masked. */
  emailsMasked: boolean;
  accounts: RegistryAccount[];
};

/**
 * A page of the registry; past the last page, the last page to go to instead (page 1 for a search
 * with no match); or a failed read, which `fetchAccounts` logs before it throws. A failed read
 * still says whether e-mails are masked: the page labels its search with it.
 */
export type AccountsResult =
  AccountsPage | { kind: "redirect"; page: number } | { kind: "failed"; emailsMasked: boolean };

/** The rôles d’équipe that see e-mails in clear and may search them. */
const ROLES_SEEING_EMAILS: readonly TeamRole[] = ["super_admin", "moderator"];

/**
 * Whether the registry masks e-mails for this rôle d’équipe and searches display names only: true
 * for a lecteur, and for any rôle not listed as seeing e-mails.
 */
function emailsMaskedFor(role: TeamRole): boolean {
  return !ROLES_SEEING_EMAILS.includes(role);
}

const toRegistryAccount = (record: AccountRecord, emailsMasked: boolean): RegistryAccount => ({
  id: record.id,
  displayName: record.display_name,
  email: emailsMasked && record.email !== null ? maskEmail(record.email) : record.email,
  signedUpAt: record.signed_up_at,
  lastSignInAt: record.last_sign_in_at,
  locale: record.locale,
  isPublic: record.is_public,
  balance: Number(record.balance),
});

/**
 * One page of the registry for a membre équipe: 50 accounts matching `search`, newest first, in
 * the order admin_list_accounts gives them. Who sees and searches e-mails is decided here from
 * the session, never from the browser; a lecteur's e-mails are masked here, before any rendering.
 */
export async function runListAccounts(
  session: StaffSession,
  { search, page }: AccountsQuery,
  deps: { fetchAccounts: (request: AccountsRequest) => Promise<AccountsPayload> },
): Promise<AccountsResult> {
  const emailsMasked = emailsMaskedFor(session.role);
  const payload = await deps
    .fetchAccounts({
      search: search || null,
      searchEmail: !emailsMasked,
      limit: ACCOUNTS_PAGE_SIZE,
      offset: (page - 1) * ACCOUNTS_PAGE_SIZE,
    })
    .catch(() => null);
  if (!payload) return { kind: "failed", emailsMasked };

  const pageCount = accountsPageCount(payload.total);
  if (page > pageCount) return { kind: "redirect", page: pageCount };

  return {
    kind: "page",
    total: payload.total,
    page,
    pageCount,
    emailsMasked,
    accounts: payload.accounts.map((record) => toRegistryAccount(record, emailsMasked)),
  };
}
