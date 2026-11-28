import { expect, test, type Page } from "./fixtures";
import { cleanup, createOAuthCode, createProviderAccount } from "../tests/integration/supabase";
import fr from "../messages/fr.json";

test.afterAll(cleanup);

const oauthErrorMessages = (fr as unknown as { Auth: { oauthError: Record<string, string> } }).Auth
  .oauthError;

// The route announcer of Next is an empty role="alert": only the visible ones count.
const alertOf = (page: Page) => page.getByRole("alert").filter({ hasText: /\S/ });

test("a visitor signs in with Discord and comes back to the page they asked for", async ({
  page,
}) => {
  // The authorize endpoint is Supabase's, then Discord's: the test plays Discord's part.
  let authorizeUrl: URL | undefined;
  await page.route("**/auth/v1/authorize**", async (route) => {
    authorizeUrl = new URL(route.request().url());
    await route.fulfill({ contentType: "text/html", body: "<p>Discord (stub)</p>" });
  });

  await page.goto("/fr/login?returnTo=%2Ffr%2Fboosters");
  await page.getByRole("button", { name: "Continuer avec Discord" }).click();

  await expect.poll(() => authorizeUrl?.searchParams.get("provider")).toBe("discord");
  await page.waitForURL(/\/auth\/v1\/authorize/);
  const redirectTo = authorizeUrl?.searchParams.get("redirect_to");
  const codeChallenge = authorizeUrl?.searchParams.get("code_challenge");
  expect(redirectTo).toBeTruthy();
  expect(codeChallenge).toBeTruthy();

  // What Supabase Auth does once Discord has answered: a new account and an auth code that
  // only the holder of the PKCE verifier (the browser's cookie) can exchange.
  const account = createProviderAccount("discord", {
    custom_claims: { global_name: "Dina Discord" },
    full_name: "dina_discord",
  });
  const code = createOAuthCode(account.id, codeChallenge!, "discord");

  const callback = new URL(redirectTo!);
  callback.searchParams.set("code", code);
  await page.goto(callback.toString());

  await expect(page).toHaveURL(/\/fr\/boosters$/, { timeout: 20_000 });
  // Only the owner opens their settings: a 200 proves the session.
  const settings = await page.goto(`/fr/players/${account.id}/settings`);
  expect(settings?.status()).toBe(200);
});

test("a Discord e-mail that needs verification lands on the login with the e-mail message", async ({
  page,
}) => {
  await page.goto(
    "/fr/auth/callback?error=access_denied&error_code=provider_email_needs_verification",
  );

  await expect(page).toHaveURL(/\/fr\/login\?/, { timeout: 20_000 });
  expect(new URL(page.url()).searchParams.get("error")).toBe("email_unusable");
  await expect(alertOf(page)).toHaveText(oauthErrorMessages.email_unusable);
});

test("Discord answering without an e-mail lands on the login with the e-mail message", async ({
  page,
}) => {
  await page.goto(
    "/fr/auth/callback?error=server_error&error_code=unexpected_failure&error_description=Error+getting+user+email+from+external+provider",
  );

  await expect(page).toHaveURL(/\/fr\/login\?/, { timeout: 20_000 });
  expect(new URL(page.url()).searchParams.get("error")).toBe("email_unusable");
  await expect(alertOf(page)).toHaveText(oauthErrorMessages.email_unusable);
});

test("a start the server refuses shows the generic OAuth message and stays on the login", async ({
  page,
}) => {
  await page.goto("/fr/login");
  const discord = page.getByRole("button", { name: "Continuer avec Discord" });
  // A forged form: the provider is not one the site offers.
  await discord.evaluate((button: HTMLButtonElement) => (button.value = "github"));
  await discord.click();

  await expect(alertOf(page)).toHaveText(oauthErrorMessages.failed);
  expect(new URL(page.url()).pathname).toBe("/fr/login");
});
