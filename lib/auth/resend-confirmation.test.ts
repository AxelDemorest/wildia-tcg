import { describe, expect, it, vi } from "vitest";
import { emailConfirmUrl } from "@/lib/auth/callback-url";
import { runResendConfirmation } from "@/lib/auth/resend-confirmation";

// The contract under test:
//   runResendConfirmation({ locale, returnTo, email, accountId }, deps)
//     -> { ok: true } | { ok: false, error: "rate_limited" | "failed" }
// `{ ok: true }` is the answer whatever happened to the address: sent, nothing to send, refused
// by Supabase. The "check your inbox" screen binds the resend to the account its sign-up created.
// deps is an object of named dependencies:
//   checkRateLimit(): true when the visitor's IP may try another auth attempt (`auth:{ip}`);
//   getOrigin(): the public origin of the site, or null when the request does not tell it;
//   getAccountEmail(accountId): the e-mail of that account, or null when no such account exists
//     (auth.admin.getUserById); asked only for an accountId that is a UUID, may throw;
//   resend({ email, emailRedirectTo }): auth-js's `{ error }` of auth.resend({ type: "signup" });
//   logError(error): receives what must not be shown to the visitor.

const ORIGIN = "https://tcg.example";
const form = {
  locale: "fr",
  returnTo: "/fr/collection",
  email: "lea@x.test",
  accountId: "7f1c2d3e-4a5b-4c6d-8e7f-9a0b1c2d3e4f",
};

function deps() {
  return {
    checkRateLimit: vi.fn(async () => true),
    getOrigin: vi.fn(async () => ORIGIN as string | null),
    getAccountEmail: vi.fn<(accountId: string) => Promise<string | null>>(async () => "lea@x.test"),
    resend: vi.fn<
      (args: {
        email: string;
        emailRedirectTo: string;
      }) => Promise<{ error: { message: string; code?: string } | null }>
    >(async () => ({ error: null })),
    logError: vi.fn<(error: unknown) => void>(() => {}),
  };
}

describe("runResendConfirmation", () => {
  it.each([
    ["the IP limit refuses", { error: "rate_limited" }],
    ["the request tells no host", { error: "failed" }],
  ] as const)(
    "refuses before reading any account or resending when %s",
    async (cause, expected) => {
      const d = deps();
      if (cause === "the IP limit refuses") d.checkRateLimit.mockResolvedValue(false);
      else d.getOrigin.mockResolvedValue(null);

      const result = await runResendConfirmation(form, d);

      expect(result).toEqual({ ok: false, ...expected });
      expect(d.getAccountEmail).not.toHaveBeenCalled();
      expect(d.resend).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["an account of another address (forged id)", "mallory@x.test", "lea@x.test", false],
    ["the same account, the address typed with capitals", "lea@x.test", "  Lea@X.test ", true],
  ] as const)(
    "resends %s: only when it is the sign-up's account, with the same answer",
    async (_case, accountEmail, typed, sent) => {
      const d = deps();
      d.getAccountEmail.mockResolvedValue(accountEmail);

      const result = await runResendConfirmation({ ...form, email: typed }, d);

      expect(result).toEqual({ ok: true });
      expect(d.getAccountEmail).toHaveBeenCalledWith(form.accountId);
      expect(d.resend).toHaveBeenCalledTimes(sent ? 1 : 0);
      if (sent) {
        const [args] = d.resend.mock.calls[0];
        expect(args.email.trim().toLowerCase()).toBe("lea@x.test");
        expect(args.emailRedirectTo).toBe(emailConfirmUrl(ORIGIN, "fr", "/fr/collection"));
      }
    },
  );

  it("answers like a successful resend and logs the error when Supabase refuses (over_email_send_rate_limit)", async () => {
    const d = deps();
    const refusal = { message: "For security purposes...", code: "over_email_send_rate_limit" };
    d.resend.mockResolvedValue({ error: refusal });

    const result = await runResendConfirmation(form, d);

    expect(result).toEqual({ ok: true });
    expect(d.logError).toHaveBeenCalledWith(refusal);
  });

  it("replaces a forged locale by the default one in the return URL of the mail", async () => {
    const d = deps();

    await runResendConfirmation({ ...form, locale: "/evil.com", returnTo: "" }, d);

    expect(d.resend).toHaveBeenCalledTimes(1);
    const [args] = d.resend.mock.calls[0];
    expect(args.emailRedirectTo.startsWith(`${ORIGIN}/fr/auth/confirm`)).toBe(true);
  });

  it("answers failed, logs the error and resends nothing when reading the account throws", async () => {
    const d = deps();
    const failure = new Error("admin API down");
    d.getAccountEmail.mockRejectedValue(failure);

    const result = await runResendConfirmation(form, d);

    expect(result).toEqual({ ok: false, error: "failed" });
    expect(d.logError).toHaveBeenCalledWith(failure);
    expect(d.resend).not.toHaveBeenCalled();
  });

  it("answers like a successful resend, without reading the account nor resending, for an accountId that is not a UUID", async () => {
    const d = deps();

    const result = await runResendConfirmation({ ...form, accountId: "lea-account" }, d);

    expect(result).toEqual({ ok: true });
    expect(d.getAccountEmail).not.toHaveBeenCalled();
    expect(d.resend).not.toHaveBeenCalled();
  });
});
