import "server-only";

import { runEmailConfirm } from "@/lib/auth/email-confirm";
import { createClient } from "@/lib/supabase/server";

/** Completes the confirmation link of the URL; returns the URL to redirect to. */
export function completeEmailConfirm(input: {
  locale: string;
  tokenHash: string | null;
  returnTo: string | null;
}): Promise<string> {
  return runEmailConfirm(input, {
    verifyOtp: async (tokenHash) => {
      const supabase = await createClient();
      // `signup` only: `email` would also accept the token of a password reset.
      return supabase.auth.verifyOtp({ token_hash: tokenHash, type: "signup" });
    },
    logError: (error) => console.error("E-mail confirmation failed.", error),
  });
}
