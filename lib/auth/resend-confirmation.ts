import { z } from "zod";
import { emailConfirmUrl } from "@/lib/auth/callback-url";
import { knownLocaleOrDefault } from "@/lib/auth/return-to";

export type ResendConfirmationDeps = {
  /** True when the visitor's IP may try another auth attempt. */
  checkRateLimit: () => Promise<boolean>;
  /** The public origin of the site, or null when the request does not tell it. */
  getOrigin: () => Promise<string | null>;
  /** The e-mail of an account, or null when no such account exists. Throws when the lookup fails. */
  getAccountEmail: (accountId: string) => Promise<string | null>;
  /** Supabase's resend of the sign-up mail, as auth-js answers it. */
  resend: (args: { email: string; emailRedirectTo: string }) => Promise<{
    error: unknown;
  }>;
  /** Receives what must not be shown to the visitor. */
  logError: (error: unknown) => void;
};

export type ResendConfirmationResult =
  { ok: true } | { ok: false; error: "rate_limited" | "failed" };

/**
 * Sends the confirmation mail of an address again. The answer is the same whatever happened to
 * the address (sent, no such account, refused by Supabase), so it never says whether an address
 * has an account. Only the last link works: Supabase replaces the token at each mail.
 *
 * With an `accountId` (the "check your inbox" screen), the mail goes only to the account that
 * sign-up created: an account replaced by a later sign-up, or an id forged for another address,
 * sends nothing. Without one (the login of an unconfirmed account, shown after the right
 * password), the address typed is used as is; Supabase's own limit per account still applies.
 * Dependencies are injected so it runs without Next nor Supabase.
 */
export async function runResendConfirmation(
  {
    locale: sentLocale,
    returnTo,
    email,
    accountId,
  }: { locale: string; returnTo: string; email: string; accountId: string | null },
  deps: ResendConfirmationDeps,
): Promise<ResendConfirmationResult> {
  if (!(await deps.checkRateLimit())) return { ok: false, error: "rate_limited" };

  const locale = knownLocaleOrDefault(sentLocale);
  const origin = await deps.getOrigin();
  if (!origin) return { ok: false, error: "failed" };

  const address = email.trim().toLowerCase();
  if (accountId !== null) {
    // Not an id Supabase could hold: nothing to look up, nothing to send.
    if (!z.guid().safeParse(accountId).success) return { ok: true };
    let accountEmail: string | null;
    try {
      accountEmail = await deps.getAccountEmail(accountId);
    } catch (lookupError) {
      deps.logError(lookupError);
      return { ok: false, error: "failed" };
    }
    if (accountEmail?.toLowerCase() !== address) return { ok: true };
  }

  const { error } = await deps.resend({
    email: address,
    emailRedirectTo: emailConfirmUrl(origin, locale, returnTo),
  });
  // Supabase refuses a mail sent too soon after the last one (and only for an unconfirmed
  // account): saying so would tell that the address has an account.
  if (error) deps.logError(error);
  return { ok: true };
}
