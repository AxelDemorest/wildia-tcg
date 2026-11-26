"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { runOAuthStart } from "@/lib/auth/oauth-start";
import { originFromHeaders } from "@/lib/auth/request-origin";
import { knownLocaleOrDefault, safeReturnTo } from "@/lib/auth/return-to";
import { createClient } from "@/lib/supabase/server";
import { assertAuthRateLimit } from "@/server/rate-limit/enforce";

export type AuthActionState = { error?: string };

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
  const limited = await enforceAuthRateLimit();
  if (limited) return limited;

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  // Sanitized again here: the form's hidden field can be forged.
  const returnTo = safeReturnTo(String(formData.get("returnTo") ?? ""), locale);
  const supabase = await createClient();
  // handle_new_user stores it as the profile's locale.
  const { error } = await supabase.auth.signUp({ email, password, options: { data: { locale } } });
  if (error) {
    return { error: error.message };
  }
  revalidatePath(`/${locale}`, "layout");
  redirect(returnTo);
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
      getOrigin: async () => {
        const h = await headers();
        return originFromHeaders((name) => h.get(name));
      },
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

export async function signOut(sentLocale: string) {
  const locale = knownLocaleOrDefault(sentLocale);
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath(`/${locale}`, "layout");
  redirect(`/${locale}/login`);
}
