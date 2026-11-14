import "server-only";

import { CONTEST } from "@/lib/contest/config";
import { parseContestEmail } from "@/lib/contest/entry-schema";
import { createServiceClient } from "@/lib/supabase/admin";

export type EnterContestResult = { ok: true } | { ok: false; error: "invalid" | "failed" };

/**
 * Registers an e-mail for the active contest. Does not touch Supabase Auth.
 * Re-submitting an already registered e-mail succeeds silently, so the form
 * never reveals who is registered.
 */
export async function enterContest(rawEmail: unknown): Promise<EnterContestResult> {
  const email = parseContestEmail(rawEmail);
  if (!email) return { ok: false, error: "invalid" };

  try {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("contest_entries")
      .upsert({ contest_key: CONTEST.key, email }, { onConflict: "contest_key,email", ignoreDuplicates: true });
    if (error) return { ok: false, error: "failed" };
  } catch {
    return { ok: false, error: "failed" };
  }

  return { ok: true };
}
