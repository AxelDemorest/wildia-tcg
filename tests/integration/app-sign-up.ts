/**
 * `runEmailSignUp` wired against the local Supabase the way the sign-up action wires it:
 * the unconfirmed account of the address is deleted by the service role's
 * `delete_unconfirmed_account` function, then the sign-up goes through an anon client that uses
 * PKCE (like the app's server client). Rate limits always allow, the origin is the local site
 * unless `origin` says otherwise.
 */
import { createClient } from "@supabase/supabase-js";
import { runEmailSignUp } from "@/lib/auth/email-sign-up";
import { admin, trackUser } from "./supabase";

const SITE_ORIGIN = "http://127.0.0.1:3000";

export async function signUpLikeTheApp(form: {
  locale: string;
  returnTo?: string;
  email: string;
  password: string;
  /** The origin the request tells; the local site by default. */
  origin?: string;
}) {
  const { origin = SITE_ORIGIN, ...fields } = form;
  const memory = new Map<string, string>();
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: "pkce",
        autoRefreshToken: false,
        storage: {
          getItem: (key) => memory.get(key) ?? null,
          setItem: (key, value) => void memory.set(key, value),
          removeItem: (key) => void memory.delete(key),
        },
      },
    },
  );
  const result = await runEmailSignUp(
    { returnTo: "", ...fields },
    {
      checkRateLimit: async () => true,
      checkAddressRateLimit: async () => true,
      getOrigin: async () => origin,
      logError: () => {},
      deleteUnconfirmedAccount: async (email: string) => {
        const { error } = await admin.rpc("delete_unconfirmed_account", { p_email: email });
        if (error) throw error;
      },
      signUp: ({ emailRedirectTo, locale, ...credentials }) =>
        client.auth.signUp({ ...credentials, options: { emailRedirectTo, data: { locale } } }),
    },
  );
  if (result.ok && result.state === "check_email") trackUser(result.accountId);
  return result;
}
