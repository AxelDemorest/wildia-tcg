"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
  locale: string,
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const limited = await enforceAuthRateLimit();
  if (limited) return limited;

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) {
    return { error: error.message };
  }
  revalidatePath(`/${locale}`, "layout");
  redirect(`/${locale}`);
}

export async function signIn(
  locale: string,
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const limited = await enforceAuthRateLimit();
  if (limited) return limited;

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: error.message };
  }
  revalidatePath(`/${locale}`, "layout");
  redirect(`/${locale}`);
}

export async function signOut(locale: string) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath(`/${locale}`, "layout");
  redirect(`/${locale}/login`);
}
