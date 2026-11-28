import { emailConfirmUrl } from "@/lib/auth/callback-url";
import { knownLocaleOrDefault, safeReturnTo } from "@/lib/auth/return-to";

export type EmailSignUpDeps = {
  /** True when the visitor's IP may try another auth attempt. */
  checkRateLimit: () => Promise<boolean>;
  /** True when this normalized address (trimmed, lower case) may sign up again. */
  checkAddressRateLimit: (address: string) => Promise<boolean>;
  /** The public origin of the site, or null when the request does not tell it. */
  getOrigin: () => Promise<string | null>;
  /** Deletes the unconfirmed account holding the address. Throws when the deletion fails. */
  deleteUnconfirmedAccount: (email: string) => Promise<void>;
  /** Receives what must not be shown to the visitor. */
  logError: (error: unknown) => void;
  /** Supabase's sign-up, as auth-js answers it. */
  signUp: (args: {
    email: string;
    password: string;
    emailRedirectTo: string;
    locale: string;
  }) => Promise<{
    data: { user: { id: string } | null; session: unknown };
    error: { message: string } | null;
  }>;
};

export type EmailSignUpResult =
  | { ok: true; state: "check_email"; accountId: string }
  | { ok: true; state: "signed_in"; returnTo: string }
  | { ok: false; error: string };

/**
 * Signs a visitor up by e-mail. The session starts at the click on the mail's link, which goes
 * to the locale's confirmation route (and then to `returnTo`). An address that already has a
 * confirmed account gets the very same answer as a new one: Supabase hides it with a masked user.
 * An account of the address that never confirmed it is deleted first: Supabase Auth would keep
 * its owner's password for the new sign-up. While "Confirm email" is off Supabase answers with a
 * session: the visitor is signed in and goes to `returnTo`.
 * Dependencies are injected so it runs without Next nor Supabase.
 */
export async function runEmailSignUp(
  {
    locale: sentLocale,
    returnTo,
    email,
    password,
  }: { locale: string; returnTo: string; email: string; password: string },
  deps: EmailSignUpDeps,
): Promise<EmailSignUpResult> {
  if (!(await deps.checkRateLimit())) return { ok: false, error: "rate_limited" };

  const locale = knownLocaleOrDefault(sentLocale);
  const origin = await deps.getOrigin();
  if (!origin) return { ok: false, error: "failed" };

  const address = email.trim().toLowerCase();
  if (!(await deps.checkAddressRateLimit(address))) return { ok: false, error: "rate_limited" };

  try {
    await deps.deleteUnconfirmedAccount(address);
  } catch (deletionError) {
    deps.logError(deletionError);
    return { ok: false, error: "failed" };
  }

  const { data, error } = await deps.signUp({
    email: address,
    password,
    emailRedirectTo: emailConfirmUrl(origin, locale, returnTo),
    locale,
  });
  if (error) return { ok: false, error: error.message };
  if (data.session)
    return { ok: true, state: "signed_in", returnTo: safeReturnTo(returnTo, locale) };
  if (!data.user) return { ok: false, error: "failed" };
  return { ok: true, state: "check_email", accountId: data.user.id };
}
