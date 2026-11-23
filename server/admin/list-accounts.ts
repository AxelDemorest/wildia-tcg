import "server-only";

import {
  runListAccounts,
  type AccountsPayload,
  type AccountsQuery,
  type AccountsRequest,
  type AccountsResult,
} from "@/lib/admin/list-accounts";
import type { StaffSession } from "@/lib/auth/staff-session";
import { createServiceClient } from "@/lib/supabase/admin";

/**
 * admin_list_accounts reads auth.users: only the service role may call it. A failure is logged
 * here, without the search (it may be an e-mail); runListAccounts then reports the read as failed.
 */
async function fetchAccounts(request: AccountsRequest): Promise<AccountsPayload> {
  try {
    const { data, error } = await createServiceClient().rpc("admin_list_accounts", {
      p_search: request.search,
      p_search_email: request.searchEmail,
      p_limit: request.limit,
      p_offset: request.offset,
    });

    if (error) throw new Error(error.message);

    return data as AccountsPayload;
  } catch (error) {
    console.error("Admin accounts: reading the registry failed.", error);
    throw error;
  }
}

/**
 * A page of the registre des comptes inscrits, read fresh with the service role. The page calls
 * requireStaff first and passes the session it got.
 */
export function listAccounts(session: StaffSession, query: AccountsQuery): Promise<AccountsResult> {
  return runListAccounts(session, query, { fetchAccounts });
}
