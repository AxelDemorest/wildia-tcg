"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
  const supabase = await createClient();
  // handle_new_user stores it as the profile's locale.
  const { error } = await supabase.auth.signUp({ email, password, options: { data: { locale } } });
  if (error) {
    return { error: error.message };
  }
  revalidatePath(`/${locale}`, "layout");
  redirect(`/${locale}`);
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

export async function signOut(sentLocale: string) {
  const locale = knownLocaleOrDefault(sentLocale);
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath(`/${locale}`, "layout");
  redirect(`/${locale}/login`);
}
