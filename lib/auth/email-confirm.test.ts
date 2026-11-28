import { describe, expect, it, vi } from "vitest";
import { runEmailConfirm } from "@/lib/auth/email-confirm";

// The contract under test:
//   runEmailConfirm({ locale, tokenHash, returnTo }, { verifyOtp, logError }) -> a site-relative URL
// tokenHash and returnTo are the `token_hash` and `returnTo` of the link's URL (null when absent).
// verifyOtp(tokenHash) -> `{ error: { code?, message } | null }`, the signup verification of
//   Supabase Auth (session cookies set); it may throw;
// logError(error) receives what must not be shown to the visitor.

type VerifyReply = { error: { code?: string; message: string } | null };

function deps() {
  return {
    verifyOtp: vi.fn<(tokenHash: string) => Promise<VerifyReply>>(async () => ({ error: null })),
    logError: vi.fn<(error: unknown) => void>(() => {}),
  };
}

const link = { locale: "fr", tokenHash: "hash-1", returnTo: "/fr/collection" };

describe("runEmailConfirm", () => {
  it("verifies the token hash and sends the visitor to the returnTo", async () => {
    const d = deps();

    const to = await runEmailConfirm(link, d);

    expect(to).toBe("/fr/collection");
    expect(d.verifyOtp).toHaveBeenCalledTimes(1);
    expect(d.verifyOtp).toHaveBeenCalledWith("hash-1");
    expect(d.logError).not.toHaveBeenCalled();
  });

  it("falls back to the locale home when the returnTo of the URL is forged", async () => {
    const d = deps();

    const to = await runEmailConfirm({ ...link, returnTo: "//evil.com" }, d);

    expect(to).toBe("/fr");
  });

  it("sends a used, expired or unknown link (otp_expired) to the login with link_expired, keeping returnTo, and logs nothing", async () => {
    const d = deps();
    d.verifyOtp.mockResolvedValue({
      error: { code: "otp_expired", message: "Email link is invalid or has expired" },
    });

    const to = await runEmailConfirm(link, d);

    expect(to).toBe("/fr/login?error=link_expired&returnTo=%2Ffr%2Fcollection");
    expect(d.logError).not.toHaveBeenCalled();
  });

  it.each([
    ["Supabase answers another error", "answers"],
    ["verifyOtp throws", "throws"],
  ] as const)(
    "sends the visitor to the login with the generic error and logs it when %s",
    async (_case, how) => {
      const d = deps();
      const failure = new Error("unexpected");
      if (how === "answers") {
        const error = { code: "unexpected_failure", message: "boom" };
        d.verifyOtp.mockResolvedValue({ error });
      } else {
        d.verifyOtp.mockRejectedValue(failure);
      }

      const to = await runEmailConfirm({ ...link, returnTo: null }, d);

      expect(to).toBe("/fr/login?error=failed");
      expect(d.logError).toHaveBeenCalledTimes(1);
      if (how === "throws") expect(d.logError).toHaveBeenCalledWith(failure);
    },
  );

  it("sends a link without token hash to the login with the generic error, without calling Supabase nor logging", async () => {
    const d = deps();
    // What GoTrue answers for a missing hash, were it asked.
    d.verifyOtp.mockResolvedValue({
      error: { code: "validation_failed", message: "Verify requires a verification type" },
    });

    const to = await runEmailConfirm({ ...link, tokenHash: null, returnTo: null }, d);

    expect(to).toBe("/fr/login?error=failed");
    expect(d.verifyOtp).not.toHaveBeenCalled();
    expect(d.logError).not.toHaveBeenCalled();
  });
});
