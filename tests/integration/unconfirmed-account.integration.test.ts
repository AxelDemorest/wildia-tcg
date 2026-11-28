/**
 * An address held by an account that never confirmed it (fact 5 of CYR-119): GoTrue keeps the
 * first account and its password, so the server deletes the unconfirmed account before the next
 * sign-up for the same address. Runs against the local Supabase: npm run test:integration.
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { signUpLikeTheApp } from "./app-sign-up";
import { waitForConfirmLink } from "./mailpit";
import {
  admin,
  cleanup,
  createPlayer,
  createSignedUpAccount,
  linkProviderIdentity,
  signUpPublicly,
  sql,
} from "./supabase";

afterAll(cleanup);

function accountRows(userId: string) {
  return sql<{ id: string; confirmed: boolean }>(
    `select id, email_confirmed_at is not null as confirmed from auth.users where id = '${userId}'`,
  );
}

describe("sign-up on an address held by an unconfirmed account", () => {
  it("makes the new password the only one that opens the confirmed account, and removes the squatter's account", async () => {
    const local = `lea-${randomUUID()}`;
    const attacker = await signUpPublicly({ email: `${local}@example.test` });
    const victimPassword = randomUUID();

    // The visitor types capitals: the address is the same one.
    const result = await signUpLikeTheApp({
      locale: "fr",
      email: `${local.replace("lea", "LEA")}@Example.TEST`,
      password: victimPassword,
    });
    expect(result, JSON.stringify(result)).toMatchObject({ ok: true });
    // The attacker's own mail is the first, the new account's the second.
    const link = await waitForConfirmLink(attacker.email, { nth: 2 });
    const victim = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    // The link goes to the app, whose route does this: verify the token hash.
    const clicked = await victim.auth.verifyOtp({
      token_hash: new URL(link).searchParams.get("token_hash")!,
      type: "signup",
    });
    expect(clicked.error).toBeNull();
    expect(clicked.data.session).not.toBeNull();
    await victim.auth.signOut();

    const withVictimPassword = await victim.auth.signInWithPassword({
      email: attacker.email,
      password: victimPassword,
    });
    expect(withVictimPassword.error).toBeNull();
    const withAttackerPassword = await victim.auth.signInWithPassword({
      email: attacker.email,
      password: attacker.password,
    });
    expect(withAttackerPassword.error?.code).toBe("invalid_credentials");
    expect(accountRows(attacker.id)).toEqual([]);
  });
});

describe("delete_unconfirmed_account", () => {
  it.each(["a confirmed account", "an unconfirmed account linked to Google"] as const)(
    "deletes nothing on the address of %s",
    async (kind) => {
      let account: { id: string; email: string };
      if (kind === "a confirmed account") {
        account = await createPlayer();
      } else {
        account = await createSignedUpAccount({ confirmed: false });
        linkProviderIdentity(account.id, "google");
      }
      const confirmedBefore = accountRows(account.id).map((row) => row.confirmed);

      const { error } = await admin.rpc("delete_unconfirmed_account", { p_email: account.email });

      expect(error).toBeNull();
      expect(accountRows(account.id).map((row) => row.confirmed)).toEqual(confirmedBefore);
      expect(confirmedBefore).toHaveLength(1);
    },
  );
});

describe("delete_unconfirmed_account address matching", () => {
  it("deletes the unconfirmed account of an address given in capitals and surrounded by spaces", async () => {
    const account = await createSignedUpAccount({ confirmed: false });
    expect(accountRows(account.id)).toHaveLength(1);

    const { error } = await admin.rpc("delete_unconfirmed_account", {
      p_email: `  ${account.email.toUpperCase()}  `,
    });

    expect(error).toBeNull();
    expect(accountRows(account.id)).toEqual([]);
  });
});
