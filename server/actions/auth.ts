"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { runEmailSignUp } from "@/lib/auth/email-sign-up";
import { runResendConfirmation } from "@/lib/auth/resend-confirmation";
import { runOAuthStart } from "@/lib/auth/oauth-start";
import { originFromHeaders } from "@/lib/auth/request-origin";
import { knownLocaleOrDefault, safeReturnTo } from "@/lib/auth/return-to";
import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { assertAuthRateLimit, assertSignUpAddressRateLimit } from "@/server/rate-limit/enforce";

export type AuthActionState = {
  error?: string;
  /** Set after an e-mail sign-up: the address typed, and the account the sign-up created. */
  checkEmail?: { email: string; accountId: string };
  /** Set when a password sign-in failed because the address is not confirmed yet. */
  unconfirmedEmail?: string;
  /** Set after a resend of the confirmation link, whatever became of the address. */
  resent?: true;
};

async function requestOrigin(): Promise<string | null> {
  const h = await headers();
  return originFromHeaders((name) => h.get(name));
}

async function enforceAuthRateLimit(): Promise<AuthActionState | null> {
  if (!(await assertAuthRateLimit())) {
    return { error: "rate_limited" };
  }
  return null;
}

export async function signUp(
  sentLocale: string,
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const locale = knownLocaleOrDefault(sentLocale);
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const returnTo = String(formData.get("returnTo") ?? "");
  const supabase = await createClient();
  const result = await runEmailSignUp(
    { locale, returnTo, email, password },
    {
      checkRateLimit: assertAuthRateLimit,
      checkAddressRateLimit: assertSignUpAddressRateLimit,
      getOrigin: requestOrigin,
      // Service role: nobody else may delete an account.
      deleteUnconfirmedAccount: async (address) => {
        const { error } = await createServiceClient().rpc("delete_unconfirmed_account", {
          p_email: address,
        });
        if (error) throw new Error(error.message);
      },
      logError: (error) => console.error("E-mail sign-up failed.", error),
      // handle_new_user stores the locale as the profile's locale.
      signUp: ({ emailRedirectTo, locale: signUpLocale, ...credentials }) =>
        supabase.auth.signUp({
          ...credentials,
          options: { emailRedirectTo, data: { locale: signUpLocale } },
        }),
    },
  );
  if (!result.ok) return { error: result.error };
  if (result.state === "signed_in") {
    revalidatePath(`/${locale}`, "layout");
    redirect(result.returnTo);
  }
  return { checkEmail: { email, accountId: result.accountId } };
}

export async function signIn(
  sentLocale: string,
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const locale = knownLocaleOrDefault(sentLocale);
  const limited = await enforceAuthRateLimit();
  if (limited) return limited;

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  // Sanitized again here: the form's hidden field can be forged.
  const returnTo = safeReturnTo(String(formData.get("returnTo") ?? ""), locale);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // The password was right: the address only lacks its confirmation, and the form offers a new link.
    if (error.code === "email_not_confirmed") {
      return { error: "email_not_confirmed", unconfirmedEmail: email };
    }
    return { error: error.message };
  }
  revalidatePath(`/${locale}`, "layout");
  redirect(returnTo);
}

export async function signInWithProvider(
  sentLocale: string,
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const locale = knownLocaleOrDefault(sentLocale);
  const returnTo = String(formData.get("returnTo") ?? "");
  // The clicked button's value; runOAuthStart refuses anything the site does not offer.
  const provider = String(formData.get("provider") ?? "");
  const supabase = await createClient();
  const result = await runOAuthStart(
    { locale, returnTo, provider },
    {
      checkRateLimit: assertAuthRateLimit,
      getOrigin: requestOrigin,
      buildAuthorizeUrl: async (redirectTo, oauthProvider) => {
        // skipBrowserRedirect: the URL comes back here, the redirect is the action's.
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: oauthProvider,
          options: { redirectTo, skipBrowserRedirect: true },
        });
        if (error) throw error;
        return data.url;
      },
    },
  );
  if (!result.ok) return { error: result.error };
  redirect(result.url);
}

export async function resendConfirmation(
  sentLocale: string,
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const locale = knownLocaleOrDefault(sentLocale);
  const email = String(formData.get("email") ?? "");
  const returnTo = String(formData.get("returnTo") ?? "");
  // Only the "check your inbox" screen has an account to bind the resend to.
  const accountId = String(formData.get("accountId") ?? "") || null;
  const supabase = await createClient();
  const result = await runResendConfirmation(
    { locale, returnTo, email, accountId },
    {
      checkRateLimit: assertAuthRateLimit,
      getOrigin: requestOrigin,
      getAccountEmail: async (id) => {
        const { data, error } = await createServiceClient().auth.admin.getUserById(id);
        if (error) {
          // An id that is no account is an outdated one.
          if (error.code === "user_not_found") return null;
          throw error;
        }
        return data.user.email ?? null;
      },
      resend: ({ email: address, emailRedirectTo }) =>
        supabase.auth.resend({ type: "signup", email: address, options: { emailRedirectTo } }),
      logError: (error) => console.error("Confirmation resend failed.", error),
    },
  );
  if (!result.ok) return { error: result.error };
  return { resent: true };
}

export async function signOut(sentLocale: string) {
  const locale = knownLocaleOrDefault(sentLocale);
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath(`/${locale}`, "layout");
  redirect(`/${locale}/login`);
}
