/**
 * The profile created for a new account, from the provider's data (handle_new_user).
 * Runs against the local Supabase: npm run test:integration (see docs/testing.md).
 */
import { afterAll, describe, expect, it } from "vitest";
import { admin, cleanup, createPlayer, createProviderAccount } from "./supabase";

afterAll(cleanup);

async function profileOf(id: string) {
  const { data, error } = await admin
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

describe("profile of a new account, from the provider's data", () => {
  it("falls back to full_name and avatar_url when the Google name and picture are blank", async () => {
    const url = "https://lh3.googleusercontent.com/a/ACg8ocLtest=s96-c";
    const { id } = createProviderAccount("google", {
      name: "  ",
      full_name: "Ada Lovelace",
      picture: " ",
      avatar_url: url,
    });

    expect(await profileOf(id)).toEqual({ display_name: "Ada Lovelace", avatar_url: url });
  });

  it.each([
    ["google", { name: " ", full_name: "  " }],
    ["discord", { custom_claims: { global_name: " " }, full_name: "  " }],
  ] as const)(
    "falls back to the e-mail's name part when every %s name is blank",
    async (provider, claims) => {
      const { id, email } = createProviderAccount(provider, { ...claims });

      expect((await profileOf(id)).display_name).toBe(email.split("@")[0].slice(0, 40));
    },
  );

  it("keeps the name and the picture of a Google account without the deprecated full_name and avatar_url", async () => {
    const picture = "https://lh3.googleusercontent.com/a/ACg8ocLstandard=s96-c";
    const { id } = createProviderAccount("google", { name: "Ada Lovelace", picture });

    expect(await profileOf(id)).toEqual({ display_name: "Ada Lovelace", avatar_url: picture });
  });

  it("takes the Discord display name, never the username#0, and the Discord avatar", async () => {
    const picture = "https://cdn.discordapp.com/avatars/123456789012345678/abcdef0123456789.png";
    const { id } = createProviderAccount("discord", {
      custom_claims: { global_name: "Loutre Rieuse" },
      full_name: "loutre",
      name: "loutre#0",
      picture,
      avatar_url: picture,
    });

    expect(await profileOf(id)).toEqual({ display_name: "Loutre Rieuse", avatar_url: picture });
  });

  it("falls back to the Discord username and drops Discord's generic avatar", async () => {
    const generic = "https://cdn.discordapp.com/embed/avatars/2.png";
    const { id } = createProviderAccount("discord", {
      custom_claims: { global_name: "" },
      full_name: "loutre",
      name: "loutre#0",
      picture: generic,
      avatar_url: generic,
    });

    expect(await profileOf(id)).toEqual({ display_name: "loutre", avatar_url: null });
  });

  it("gives no avatar to an e-mail signup, whatever its metadata holds", async () => {
    const url = "https://example.test/me.png";
    const player = await createPlayer({ avatar_url: url, picture: url });

    expect((await profileOf(player.id)).avatar_url).toBeNull();
  });

  it("keeps a custom avatar when the Auth row is updated at a later sign-in", async () => {
    const custom = "https://example.test/custom-avatar.png";
    const pictureA = "https://lh3.googleusercontent.com/a/picture-a=s96-c";
    const pictureB = "https://lh3.googleusercontent.com/a/picture-b=s96-c";
    const { id } = createProviderAccount("google", {
      name: "Ada Lovelace",
      full_name: "Ada Lovelace",
      picture: pictureA,
      avatar_url: pictureA,
    });
    const { error } = await admin.from("profiles").update({ avatar_url: custom }).eq("id", id);
    if (error) throw error;

    const { error: updateError } = await admin.auth.admin.updateUserById(id, {
      user_metadata: { picture: pictureB, avatar_url: pictureB },
    });
    if (updateError) throw updateError;

    expect((await profileOf(id)).avatar_url).toBe(custom);
  });

  it("drops an avatar that is not an https URL", async () => {
    const picture = "http://lh3.googleusercontent.com/a/ACg8ocLtest=s96-c";
    const { id } = createProviderAccount("google", {
      name: "Ada Lovelace",
      full_name: "Ada Lovelace",
      picture,
      avatar_url: picture,
    });

    expect((await profileOf(id)).avatar_url).toBeNull();
  });
});
