import { describe, expect, it, vi } from "vitest";
import { runEmailSignUp } from "@/lib/auth/email-sign-up";

// The contract under test:
//   runEmailSignUp({ locale, returnTo, email, password }, deps)
//     -> { ok: true, state: "check_email", accountId }
//      | { ok: false, error: "rate_limited" | "failed" | <Supabase's message, shown as is> }
//      | { ok: true, state: "signed_in", returnTo }   (Supabase answered with a session)
// deps is an object of named dependencies:
//   checkRateLimit(): true when the visitor's IP may try another auth attempt;
//   checkAddressRateLimit(address): true when this normalized address (trimmed, lower case) may
//     sign up again (1 per 60 s), asked after the origin check;
//   getOrigin(): the public origin of the site, or null when the request does not tell it;
//   deleteUnconfirmedAccount(email): Promise<void>, deletes the unconfirmed account holding the
//     address; asked after the limits and before signUp, throws when the deletion fails;
//   logError(error): receives what must not be shown to the visitor;
//   signUp({ email, password, emailRedirectTo, locale }): auth-js's `{ data: { user, session }, error }`.

const ORIGIN = "https://tcg.example";
const form = {
  locale: "fr",
  returnTo: "/fr/collection",
  email: "lea@x.test",
  password: "secret-pw1",
};

type SignUpArgs = { email: string; password: string; emailRedirectTo: string; locale: string };
type SignUpReply = {
  data: { user: { id: string; identities: unknown[] } | null; session: unknown };
  error: { message: string } | null;
};

function deps() {
  return {
    checkRateLimit: vi.fn(async () => true),
    checkAddressRateLimit: vi.fn<(address: string) => Promise<boolean>>(async () => true),
    getOrigin: vi.fn(async () => ORIGIN as string | null),
    deleteUnconfirmedAccount: vi.fn<(email: string) => Promise<void>>(async () => {}),
    logError: vi.fn<(error: unknown) => void>(() => {}),
    signUp: vi.fn<(args: SignUpArgs) => Promise<SignUpReply>>(async () => ({
      data: { user: { id: "new-account", identities: [{ provider: "email" }] }, session: null },
      error: null,
    })),
  };
}

describe("runEmailSignUp", () => {
  it("answers an already confirmed address exactly like a new one, with the masked user's id", async () => {
    const d = deps();
    // GoTrue's anti-enumeration answer: a masked user without identities, and no session.
    d.signUp.mockResolvedValue({
      data: { user: { id: "masked-account", identities: [] }, session: null },
      error: null,
    });

    const result = await runEmailSignUp(form, d);

    expect(result).toEqual({ ok: true, state: "check_email", accountId: "masked-account" });
  });

  it("answers failed and never calls Supabase when the request tells no host", async () => {
    const d = deps();
    d.getOrigin.mockResolvedValue(null);

    const result = await runEmailSignUp(form, d);

    expect(result).toEqual({ ok: false, error: "failed" });
    expect(d.signUp).not.toHaveBeenCalled();
    expect(d.deleteUnconfirmedAccount).not.toHaveBeenCalled();
    expect(d.checkAddressRateLimit).not.toHaveBeenCalled();
  });

  it("gives back Supabase's message, without check_email, when it refuses the sign-up", async () => {
    const d = deps();
    d.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "Password should be at least 8 characters." },
    });

    const result = await runEmailSignUp(form, d);

    expect(result).toEqual({ ok: false, error: "Password should be at least 8 characters." });
  });

  it("sends the visitor to the sanitized returnTo when Supabase answers with a session (Confirm email off)", async () => {
    const d = deps();
    d.signUp.mockResolvedValue({
      data: { user: { id: "new-account", identities: [{ provider: "email" }] }, session: {} },
      error: null,
    });

    const result = await runEmailSignUp(form, d);

    expect(result).toEqual({ ok: true, state: "signed_in", returnTo: "/fr/collection" });
  });

  it("falls back to the locale's home for a forged returnTo when Supabase answers with a session", async () => {
    const d = deps();
    d.signUp.mockResolvedValue({
      data: { user: { id: "new-account", identities: [{ provider: "email" }] }, session: {} },
      error: null,
    });

    const result = await runEmailSignUp({ ...form, returnTo: "//evil.com" }, d);

    expect(result).toEqual({ ok: true, state: "signed_in", returnTo: "/fr" });
  });

  it("answers failed, logs the error and never signs up when the deletion throws", async () => {
    const d = deps();
    const failure = new Error("permission denied for function delete_unconfirmed_account");
    d.deleteUnconfirmedAccount.mockRejectedValue(failure);

    const result = await runEmailSignUp(form, d);

    expect(result).toEqual({ ok: false, error: "failed" });
    expect(d.logError).toHaveBeenCalledWith(failure);
    expect(d.signUp).not.toHaveBeenCalled();
  });

  it("answers rate_limited without deleting nor signing up when the address limit refuses", async () => {
    const d = deps();
    d.checkAddressRateLimit.mockResolvedValue(false);

    const result = await runEmailSignUp(form, d);

    expect(result).toEqual({ ok: false, error: "rate_limited" });
    expect(d.deleteUnconfirmedAccount).not.toHaveBeenCalled();
    expect(d.signUp).not.toHaveBeenCalled();
  });

  it("counts Lea@x and lea@x as one address: the limit receives the trimmed lower-case address", async () => {
    const d = deps();

    await runEmailSignUp({ ...form, email: "  Lea@X.test " }, d);

    expect(d.checkAddressRateLimit).toHaveBeenCalledTimes(1);
    expect(d.checkAddressRateLimit).toHaveBeenCalledWith("lea@x.test");
  });

  it("answers rate_limited and does nothing else when the IP limit refuses", async () => {
    const d = deps();
    d.checkRateLimit.mockResolvedValue(false);

    const result = await runEmailSignUp(form, d);

    expect(result).toEqual({ ok: false, error: "rate_limited" });
    expect(d.getOrigin).not.toHaveBeenCalled();
    expect(d.checkAddressRateLimit).not.toHaveBeenCalled();
    expect(d.deleteUnconfirmedAccount).not.toHaveBeenCalled();
    expect(d.signUp).not.toHaveBeenCalled();
  });

  it("answers failed when Supabase returns neither an error, a session nor a user", async () => {
    const d = deps();
    d.signUp.mockResolvedValue({ data: { user: null, session: null }, error: null });

    const result = await runEmailSignUp(form, d);

    expect(result).toEqual({ ok: false, error: "failed" });
  });

  it("replaces a forged locale by the default one in the return URL and in the locale given to Supabase", async () => {
    const d = deps();

    await runEmailSignUp({ ...form, locale: "/evil.com", returnTo: "" }, d);

    expect(d.signUp).toHaveBeenCalledTimes(1);
    const [args] = d.signUp.mock.calls[0];
    expect(args.locale).toBe("fr");
    expect(args.emailRedirectTo.startsWith(`${ORIGIN}/fr/auth/confirm`)).toBe(true);
  });
});
