/**
 * The identity guard on auth.identities: Supabase Auth never creates or links an OAuth identity
 * whose e-mail is unverified (R1), nor links one to an account whose `email` identity is neither
 * verified by its link nor on an account still unconfirmed (R2, relaxed by CYR-119).
 * The guard also covers updates: Supabase Auth rewrites `identity_data` at each repeated sign-in.
 * Supabase Auth creates the user and the identity in one transaction: a refusal leaves nothing.
 * Runs against the local Supabase: npm run test:integration (see docs/testing.md).
 */
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import {
  admin,
  cleanup,
  confirmWithoutClick,
  createProviderAccount,
  createSignedUpAccount,
  linkProviderIdentity,
  signUpPublicly,
  sql,
  updateProviderIdentity,
} from "./supabase";

afterAll(cleanup);

function identitiesOf(userId: string): string[] {
  return sql<{ provider: string }>(
    `select provider from auth.identities where user_id = '${userId}' order by provider`,
  ).map((row) => row.provider);
}

describe("unverified OAuth identity (R1)", () => {
  it("refuses a new Discord account and leaves no user nor profile behind", async () => {
    // A unique name finds what the failed insert may have left behind.
    const marker = `guard-${randomUUID()}`;

    expect(() =>
      createProviderAccount("discord", {
        email_verified: false,
        full_name: marker,
        custom_claims: { global_name: marker },
      }),
    ).toThrow();

    expect(
      sql(`select id from auth.users where raw_user_meta_data ->> 'full_name' = '${marker}'`),
    ).toEqual([]);
    const { data, error } = await admin.from("profiles").select("id").eq("display_name", marker);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});

describe("OAuth identity on an account with a password (R2)", () => {
  it("refuses to link a verified Discord identity to an account confirmed without a click (Autoconfirm)", async () => {
    // "Confirm email" off: the sign-up confirms the account itself, and the e-mail identity's
    // own email_verified stays false. The visitor even claims email_verified in the metadata.
    const account = await signUpPublicly({ data: { email_verified: true } });
    confirmWithoutClick(account.id);

    expect(() => linkProviderIdentity(account.id, "discord")).toThrow();

    expect(identitiesOf(account.id)).toEqual(["email"]);
  });

  it("links a verified Google identity to an account confirmed by its link: two identities", async () => {
    const account = await createSignedUpAccount({ confirmed: true });

    linkProviderIdentity(account.id, "google");

    expect(identitiesOf(account.id)).toEqual(["email", "google"]);
    // The click is what marks the e-mail identity verified.
    const [identity] = sql<{ verified: string }>(
      `select identity_data ->> 'email_verified' as verified from auth.identities
       where user_id = '${account.id}' and provider = 'email'`,
    );
    expect(identity.verified).toBe("true");
  });

  it("lets a verified Google identity in on an account that was never confirmed (Supabase Auth then removes the e-mail identity and the password)", async () => {
    const account = await createSignedUpAccount({ confirmed: false });

    linkProviderIdentity(account.id, "google");

    expect(identitiesOf(account.id)).toEqual(["email", "google"]);
  });
});

describe("verified OAuth identity on a social account", () => {
  it("links a verified Discord identity to an existing Google account: one account, two identities", () => {
    const { id } = createProviderAccount("google", { name: "Gina Google" });

    linkProviderIdentity(id, "discord");

    expect(identitiesOf(id)).toEqual(["discord", "google"]);
  });
});

describe("update of an OAuth identity", () => {
  function identityEmail(userId: string): string {
    return sql<{ email: string }>(
      `select email from auth.identities where user_id = '${userId}' and provider = 'discord'`,
    )[0].email;
  }

  it("refuses to move an existing Discord identity to another e-mail that is unverified", () => {
    const { id, email } = createProviderAccount("discord", {});

    expect(() =>
      updateProviderIdentity(id, "discord", {
        email: `victim-${randomUUID()}@example.test`,
        email_verified: false,
      }),
    ).toThrow();

    expect(identityEmail(id)).toBe(email);
  });

  it("accepts an update that keeps the e-mail even when email_verified is false", () => {
    const { id, email } = createProviderAccount("discord", {});

    updateProviderIdentity(id, "discord", { email_verified: false, global_name: "Renamed" });

    expect(identityEmail(id)).toBe(email);
    const [row] = sql<{ name: string }>(
      `select identity_data ->> 'global_name' as name from auth.identities where user_id = '${id}'`,
    );
    expect(row.name).toBe("Renamed");
  });
});
