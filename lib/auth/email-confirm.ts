import { failureUrl } from "@/lib/auth/oauth-callback";
import { knownLocaleOrDefault, safeReturnTo } from "@/lib/auth/return-to";

export type EmailConfirmDeps = {
  /**
   * Verifies the signup token hash with Supabase Auth, which opens the session (cookies set) and
   * confirms the address. May throw.
   */
  verifyOtp: (tokenHash: string) => Promise<{ error: { code?: string; message: string } | null }>;
  /** Receives what must not be shown to the visitor. */
  logError: (error: unknown) => void;
};

/**
 * Opens the session of the link of a confirmation mail and says where to send the visitor (a
 * site-relative URL): the sanitized `returnTo`, or the login with the error to show. A link that
 * is used, expired or unknown (`otp_expired`) is the visitor's doing, not an incident.
 * Dependencies are injected so it runs without Next nor Supabase.
 */
export async function runEmailConfirm(
  {
    locale,
    tokenHash,
    returnTo,
  }: { locale: string; tokenHash: string | null; returnTo: string | null },
  deps: EmailConfirmDeps,
): Promise<string> {
  if (!tokenHash) return failureUrl(locale, "failed", returnTo);

  try {
    const { error } = await deps.verifyOtp(tokenHash);
    if (error) {
      if (error.code === "otp_expired") return failureUrl(locale, "link_expired", returnTo);
      deps.logError(error);
      return failureUrl(locale, "failed", returnTo);
    }
  } catch (verifyError) {
    deps.logError(verifyError);
    return failureUrl(locale, "failed", returnTo);
  }

  // Sanitized again here: the URL's returnTo can be forged.
  return safeReturnTo(returnTo ?? undefined, knownLocaleOrDefault(locale));
}
