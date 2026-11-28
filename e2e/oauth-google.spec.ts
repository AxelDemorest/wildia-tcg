import { expect, test, type Page } from "./fixtures";
import {
  admin,
  cleanup,
  createOAuthCode,
  createProviderAccount,
} from "../tests/integration/supabase";
import fr from "../messages/fr.json";

test.afterAll(cleanup);

test("a visitor signs in with Google and comes back to the page they asked for", async ({
  page,
}) => {
  // The authorize endpoint is Supabase's, then Google's: the test plays Google's part.
  let authorizeUrl: URL | undefined;
  await page.route("**/auth/v1/authorize**", async (route) => {
    authorizeUrl = new URL(route.request().url());
    await route.fulfill({ contentType: "text/html", body: "<p>Google (stub)</p>" });
  });

  await page.goto("/en/login?returnTo=%2Fen%2Fboosters");
  await page.getByRole("button", { name: "Continue with Google" }).click();

  await expect.poll(() => authorizeUrl?.searchParams.get("provider")).toBe("google");
  // The Server Action's redirect must have landed before the test navigates on its own.
  await page.waitForURL(/\/auth\/v1\/authorize/);
  const redirectTo = authorizeUrl?.searchParams.get("redirect_to");
  const codeChallenge = authorizeUrl?.searchParams.get("code_challenge");
  expect(redirectTo).toBeTruthy();
  expect(codeChallenge).toBeTruthy();

  // What Supabase Auth does once Google has answered: a new account and an auth code that
  // only the holder of the PKCE verifier (the browser's cookie) can exchange.
  const account = createProviderAccount("google", { name: "Gina Google" });
  const code = createOAuthCode(account.id, codeChallenge!);

  const callback = new URL(redirectTo!);
  callback.searchParams.set("code", code);
  await page.goto(callback.toString());

  await expect(page).toHaveURL(/\/en\/boosters$/, { timeout: 20_000 });
  // Only the owner opens their settings: a 200 proves the session.
  const settings = await page.goto(`/en/players/${account.id}/settings`);
  expect(settings?.status()).toBe(200);

  const { data, error } = await admin
    .from("profiles")
    .select("locale")
    .eq("id", account.id)
    .single();
  expect(error).toBeNull();
  expect(data?.locale).toBe("en");
});

const oauthErrorMessages = (fr as unknown as { Auth: { oauthError: Record<string, string> } }).Auth
  .oauthError;

// The route announcer of Next is an empty role="alert": only the visible ones count.
const alertOf = (page: Page) => page.getByRole("alert").filter({ hasText: /\S/ });

test("a visitor starts Google from the signup, and both OAuth buttons are disabled while it is pending", async ({
  page,
  baseURL,
}) => {
  let authorizeUrl: URL | undefined;
  await page.route("**/auth/v1/authorize**", async (route) => {
    authorizeUrl = new URL(route.request().url());
    await route.fulfill({ contentType: "text/html", body: "<p>Google (stub)</p>" });
  });
  // Holds the Server Action's POST, so the pending state can be looked at.
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/signup**", async (route) => {
    if (route.request().method() === "POST" && route.request().headers()["next-action"]) {
      await gate;
    }
    await route.continue();
  });

  await page.goto("/fr/signup?returnTo=%2Ffr%2Fboosters");
  const google = page.getByRole("button", { name: "Continuer avec Google" });
  const discord = page.getByRole("button", { name: "Continuer avec Discord" });
  await google.click();
  await expect(google).toBeDisabled();
  await expect(discord).toBeDisabled();
  release();

  await expect.poll(() => authorizeUrl?.searchParams.get("provider")).toBe("google");
  await page.waitForURL(/\/auth\/v1\/authorize/);
  const redirectTo = new URL(authorizeUrl?.searchParams.get("redirect_to") ?? "");
  expect(redirectTo.origin + redirectTo.pathname).toBe(`${baseURL}/fr/auth/callback`);
  expect(redirectTo.searchParams.get("returnTo")).toBe("/fr/boosters");
});

test("a refused consent lands on the login with the translated message and the returnTo kept", async ({
  page,
}) => {
  await page.goto(
    "/fr/auth/callback?error=access_denied&error_description=User+denied+access+raw-supabase-text&returnTo=%2Ffr%2Fboosters",
  );

  await expect(page).toHaveURL(/\/fr\/login\?/, { timeout: 20_000 });
  const url = new URL(page.url());
  expect(url.pathname).toBe("/fr/login");
  expect(url.searchParams.get("error")).toBe("access_denied");
  expect(url.searchParams.get("returnTo")).toBe("/fr/boosters");
  await expect(alertOf(page)).toHaveText(oauthErrorMessages.access_denied);
  await expect(page.getByText("raw-supabase-text")).toHaveCount(0);
});

test("a code Supabase refuses lands on the login with the generic OAuth message", async ({
  page,
}) => {
  await page.goto("/fr/auth/callback?code=bogus");

  await expect(page).toHaveURL(/\/fr\/login\?/, { timeout: 20_000 });
  expect(new URL(page.url()).searchParams.get("error")).toBe("failed");
  await expect(alertOf(page)).toHaveText(oauthErrorMessages.failed);
});

test("the login shows no message for an error value outside the closed list", async ({ page }) => {
  await page.goto("/fr/login?error=Unable+to+exchange+external+code+raw-supabase-text");

  await expect(page.getByRole("button", { name: "Continuer avec Google" })).toBeVisible();
  await expect(alertOf(page)).toHaveCount(0);
  await expect(page.getByText("raw-supabase-text")).toHaveCount(0);
});
