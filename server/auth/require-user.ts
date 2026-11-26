import "server-only";

import { redirect } from "next/navigation";
import { loginHref } from "@/lib/auth/return-to";
import type { SessionUser } from "@/lib/auth/session-user";
import { createClient } from "@/lib/supabase/server";

function toSessionUser(authUser: { id: string; email?: string | null }): SessionUser {
  return { id: authUser.id, email: authUser.email };
}

export async function getUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return toSessionUser(user);
}

/** The signed-in user, or a redirect to the login that comes back to `path`. */
export async function requireUser(locale: string, path: string): Promise<SessionUser> {
  const user = await getUser();
  if (!user) {
    redirect(loginHref(locale, path));
  }
  return user;
}
