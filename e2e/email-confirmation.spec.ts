import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "./fixtures";
import { waitForConfirmLink, waitForMessage } from "../tests/integration/mailpit";
import { admin, adoptUserByEmail, cleanup, signUpPublicly } from "../tests/integration/supabase";

test.afterAll(cleanup);

// The route announcer of Next is an empty role="alert": only the visible ones count.
const alertOf = (page: Page) => page.getByRole("alert").filter({ hasText: /\S/ });

// GoTrue sends a second mail to an account only after `max_frequency` (1 s locally).
async function afterMaxFrequency(email: string) {
  const first = await waitForMessage(email);
  const wait = Date.parse(first.created) + 1_500 - Date.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
}

async function signUpFromForm(page: Page, path: string, email: string, password: string) {
  await page.goto(path);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("button", { name: "S'inscrire" }).click();
  await expect(page.getByRole("status").filter({ hasText: /vérifiez votre boîte/i })).toBeVisible();
  return adoptUserByEmail(email);
}

test("a link opened in another browser opens a session there, and opened again in the sign-up browser it is a used link", async ({
  page,
  browser,
  baseURL,
  extraHTTPHeaders,
}) => {
  const email = `test-${randomUUID().slice(0, 8)}@example.test`;
  await page.goto("/en/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(randomUUID());
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page.getByRole("status").filter({ hasText: /check your inbox/i })).toBeVisible();
  const userId = await adoptUserByEmail(email);
  const link = await waitForConfirmLink(email);

  // Another browser: same client address, no cookie.
  const other = await browser.newContext({ baseURL, extraHTTPHeaders });
  const otherPage = await other.newPage();
  try {
    await otherPage.goto(link);
    await expect(otherPage).toHaveURL(/\/en$/, { timeout: 20_000 });
    // Only the owner opens their settings: a 200 proves the session.
    const response = await otherPage.goto(`/en/players/${userId}/settings`);
    expect(response?.status()).toBe(200);
  } finally {
    await other.close();
  }

  // The sign-up browser has no session and the link is used by now.
  await page.goto(link);
  await expect(page).toHaveURL(/\/en\/login/, { timeout: 20_000 });
  await expect(alertOf(page)).toContainText(
    /if the address is still waiting for its confirmation/i,
  );
});

test("a password sign-in before the link asks to confirm the address, offers a new link, and that link signs in", async ({
  page,
}) => {
  const email = `test-${randomUUID().slice(0, 8)}@example.test`;
  const password = randomUUID();
  const userId = await signUpFromForm(page, "/fr/signup", email, password);
  await afterMaxFrequency(email);

  await page.goto("/fr/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();

  await expect(alertOf(page)).toContainText(/confirmez votre adresse/i);
  await expect(page).toHaveURL(/\/fr\/login/);

  await page.getByRole("button", { name: /renvoyer le lien/i }).click();
  await expect(page.getByRole("status").filter({ hasText: /nouveau lien/i })).toBeVisible();

  await page.goto(await waitForConfirmLink(email, { nth: 2 }));
  await expect(page).toHaveURL(/\/fr$/, { timeout: 20_000 });
  const response = await page.goto(`/fr/players/${userId}/settings`);
  expect(response?.status()).toBe(200);
});

test("the resend button of the check-your-inbox screen sends a second link that signs in on the page asked for", async ({
  page,
}) => {
  const email = `test-${randomUUID().slice(0, 8)}@example.test`;
  const userId = await signUpFromForm(
    page,
    "/fr/signup?returnTo=%2Ffr%2Fboosters",
    email,
    randomUUID(),
  );
  await afterMaxFrequency(email);

  await page.getByRole("button", { name: /renvoyer le lien/i }).click();
  await expect(page.getByRole("status").filter({ hasText: /nouveau lien/i })).toBeVisible();

  await page.goto(await waitForConfirmLink(email, { nth: 2 }));
  await expect(page).toHaveURL(/\/fr\/boosters$/, { timeout: 20_000 });
  const response = await page.goto(`/fr/players/${userId}/settings`);
  expect(response?.status()).toBe(200);
});

test("the resend button of the check-your-inbox screen answers as usual when the account was replaced by a later sign-up, and sends nothing", async ({
  page,
}) => {
  const email = `test-${randomUUID().slice(0, 8)}@example.test`;
  await signUpFromForm(page, "/fr/signup", email, randomUUID());

  // A later sign-up replaces the account the screen is bound to.
  const { error } = await admin.rpc("delete_unconfirmed_account", { p_email: email });
  if (error) throw error;
  await signUpPublicly({ email });
  const second = await waitForMessage(email, { nth: 2 });
  const wait = Date.parse(second.created) + 1_500 - Date.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));

  await page.getByRole("button", { name: /renvoyer le lien/i }).click();

  await expect(page.getByRole("status").filter({ hasText: /nouveau lien/i })).toBeVisible();
  await expect(alertOf(page)).toHaveCount(0);
  await expect(waitForMessage(email, { nth: 3, timeoutMs: 3_000 })).rejects.toThrow();
});
