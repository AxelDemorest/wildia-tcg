import { expect, test, type Page } from "./fixtures";
import { cleanup, createPlayer } from "../tests/integration/supabase";

test.afterAll(cleanup);

const screens = [
  {
    name: "login in French",
    path: "/fr/login?returnTo=%2Ffr%2Fcollection",
    heading: "Connexion",
    submit: "Se connecter",
    google: "Continuer avec Google",
    discord: "Continuer avec Discord",
    separator: "ou",
    email: "E-mail",
    password: "Mot de passe",
    crossPath: "/fr/signup",
    crossReturnTo: "/fr/collection",
    crossText: /Créer un compte/,
    crossSentence: /Pas encore de compte\s*\?/,
  },
  {
    name: "signup in English",
    path: "/en/signup?returnTo=%2Fen%2Fcollection",
    heading: "Sign up",
    submit: "Sign up",
    google: "Continue with Google",
    discord: "Continue with Discord",
    separator: "or",
    email: "Email",
    password: "Password",
    crossPath: "/en/login",
    crossReturnTo: "/en/collection",
    crossText: /Log in/,
    crossSentence: /Already have an account\s*\?/,
  },
];

for (const screen of screens) {
  test(`the ${screen.name} shows both providers, the separator, the e-mail form and the link to the other page`, async ({
    page,
    baseURL,
  }) => {
    await page.goto(screen.path);
    const main = page.getByRole("main");

    await expect(main.getByRole("heading", { name: screen.heading, exact: true })).toBeVisible();
    await expect(main.getByRole("button", { name: screen.submit })).toBeVisible();

    // The accessible name is the label alone: the brand icon is hidden from it.
    for (const label of [screen.google, screen.discord]) {
      const button = main.getByRole("button", { name: label, exact: true });
      await expect(button).toBeVisible();
      await expect(button.locator("svg")).toHaveCount(1);
      await expect(button.locator("svg")).toHaveAttribute("aria-hidden", "true");
    }

    // OAuth on top, then the separator, then the e-mail form.
    const lastOAuth = await main
      .getByRole("button", { name: screen.discord, exact: true })
      .boundingBox();
    const separator = await main.getByText(screen.separator, { exact: true }).boundingBox();
    const emailField = await main.getByLabel(screen.email).boundingBox();
    expect(lastOAuth && separator && emailField).toBeTruthy();
    expect(separator!.y).toBeGreaterThanOrEqual(lastOAuth!.y + lastOAuth!.height);
    expect(emailField!.y).toBeGreaterThanOrEqual(separator!.y + separator!.height);
    await expect(main.getByLabel(screen.password)).toBeVisible();

    // The cross link goes to the other page and keeps the page to come back to.
    await expect(main.getByText(screen.crossSentence)).toBeVisible();
    const link = main.getByRole("link", { name: screen.crossText });
    await expect(link).toHaveCount(1);
    const href = new URL((await link.getAttribute("href"))!, baseURL);
    expect(href.pathname).toBe(screen.crossPath);
    expect(href.searchParams.get("returnTo")).toBe(screen.crossReturnTo);
  });
}

async function signInAsPlayer(page: Page) {
  const player = await createPlayer();
  await page.goto("/fr/login");
  await page.getByLabel("E-mail").fill(player.email);
  await page.getByLabel("Mot de passe").fill(player.password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/fr$/, { timeout: 20_000 });
}

test("a signed-in visitor opening the signup with a returnTo is sent to that page", async ({
  page,
}) => {
  await signInAsPlayer(page);

  await page.goto("/fr/signup?returnTo=%2Ffr%2Fcollection");

  await expect(page).toHaveURL(/\/fr\/collection$/, { timeout: 20_000 });
});

test("a signed-in visitor opening the signup with a forged returnTo lands on the home", async ({
  page,
}) => {
  await signInAsPlayer(page);

  await page.goto("/fr/signup?returnTo=%2F%2Fevil.com");

  await expect(page).toHaveURL(/\/fr$/, { timeout: 20_000 });
});
