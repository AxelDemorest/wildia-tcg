import "server-only";

import { runOAuthCallback, type ExchangedUser } from "@/lib/auth/oauth-callback";
import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function exchangeCode(code: string): Promise<ExchangedUser> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw error;
  const { user } = data;
  return { id: user.id, createdAt: user.created_at, lastSignInAt: user.last_sign_in_at ?? null };
}

/** Service role: players have no grant on profiles.locale. */
async function writeLocale(userId: string, locale: string): Promise<void> {
  const { error } = await createServiceClient()
    .from("profiles")
    .update({ locale })
    .eq("id", userId);
  if (error) throw new Error(error.message);
}

/** Completes the provider sign-in of the callback URL; returns the URL to redirect to. */
export function completeOAuthSignIn(input: {
  locale: string;
  code: string | null;
  returnTo: string | null;
  error: string | null;
  errorCode: string | null;
  errorDescription: string | null;
}): Promise<string> {
  return runOAuthCallback(input, {
    exchangeCode,
    writeLocale,
    logError: (error) => console.error("OAuth callback failed.", error),
  });
}
