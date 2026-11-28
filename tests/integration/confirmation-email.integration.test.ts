/**
 * The confirmation mail, in the language of the sign-up (CYR-119): subject and body, no word of
 * the other language, and a link that goes straight to the locale's /auth/confirm route with a
 * token_hash that opens a session. An origin the redirect allow-list refuses falls back to the
 * Site URL. Runs against the local Supabase and Mailpit: npm run test:integration.
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { signUpLikeTheApp } from "./app-sign-up";
import { confirmLink, waitForMessage } from "./mailpit";
import { cleanup } from "./supabase";

afterAll(cleanup);

// What each language's mail must say, and what only the other language's says.
const MAILS = {
  fr: {
    subject: /^Confirmez votre (adresse|e-mail)/i,
    body: /confirm(ez|er) (votre|mon) (adresse|e-mail)/i,
    other: /confirm your|click|verify your/i,
  },
  en: {
    subject: /^Confirm your (address|email|e-mail)/i,
    body: /confirm your (address|email|e-mail)/i,
    other: /confirmez|confirmer|votre|adresse/i,
  },
} as const;

describe("confirmation mail", () => {
  it.each(
    (["fr", "en"] as const).flatMap((locale) => [
      [locale, "an allowed origin", "http://localhost:3000"],
      [locale, "an origin the allow-list refuses", "https://evil.example"],
    ]),
  )(
    "arrives in %s, for %s, with a link to that locale's /auth/confirm that opens a session",
    async (locale, _case, origin) => {
      const email = `test-${randomUUID()}@example.test`;

      const result = await signUpLikeTheApp({ locale, email, password: randomUUID(), origin });
      expect(result).toMatchObject({ ok: true });

      const message = await waitForMessage(email);
      expect(message.subject).toMatch(MAILS[locale].subject);
      expect(message.html).toMatch(MAILS[locale].body);
      expect(message.subject).not.toMatch(MAILS[locale].other);
      expect(message.html).not.toMatch(MAILS[locale].other);

      const link = confirmLink(message);
      // The allowed origin is kept (RedirectTo); the refused one never reaches the mail: GoTrue
      // answers with the Site URL, which the template turns into the same route.
      expect(link).toMatch(
        new RegExp(
          `^http://(localhost|127\\.0\\.0\\.1):3000/${locale}/auth/confirm\\?returnTo=%2F${locale}&token_hash=`,
        ),
      );
      if (origin === "http://localhost:3000") expect(link.startsWith(origin)).toBe(true);

      const tokenHash = new URL(link).searchParams.get("token_hash")!;
      const anon = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } },
      );
      const { data, error } = await anon.auth.verifyOtp({ token_hash: tokenHash, type: "signup" });
      expect(error).toBeNull();
      expect(data.session).not.toBeNull();
    },
  );
});
