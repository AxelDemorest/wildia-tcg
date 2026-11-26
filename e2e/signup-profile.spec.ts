import { randomUUID } from "node:crypto";
import { expect, test } from "./fixtures";
import { admin, adoptUserByEmail, cleanup } from "../tests/integration/supabase";

test.afterAll(cleanup);

test("a visitor signs up, fills their public profile and sees it on their player page", async ({
  page,
}) => {
  const email = `test-${randomUUID().slice(0, 8)}@example.test`;
  const password = randomUUID();

  await test.step("sign up", async () => {
    await page.goto("/fr/signup");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Mot de passe").fill(password);
    await page.getByRole("button", { name: "S'inscrire" }).click();

    await expect(page).toHaveURL(/\/fr$/);
  });
  const userId = await adoptUserByEmail(email);

  await test.step("fill the public profile", async () => {
    await page.goto("/fr/settings/profile");
    await expect(page).toHaveURL(/\/fr\/settings\/profile$/);

    await page.getByLabel("Pseudo affiché").fill("Testeur E2E");
    await page.getByLabel("Bio").fill("Fan de loutres et de pandas.");
    await page.getByLabel("Profil visible par tous").check();
    await page.getByRole("button", { name: "Enregistrer" }).click();

    await expect(page.getByText("Profil enregistré.")).toBeVisible();
  });

  await test.step("see it on the player page, signed out", async () => {
    await page.context().clearCookies();
    await page.goto(`/fr/players/${userId}`);

    await expect(page.getByText("Testeur E2E").first()).toBeVisible();
    await expect(page.getByText("Fan de loutres et de pandas.")).toBeVisible();
  });
});

test("signing up in English stores the English locale", async ({ page }) => {
  const email = `test-${randomUUID().slice(0, 8)}@example.test`;

  await page.goto("/en/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(randomUUID());
  await page.getByRole("button", { name: "Sign up" }).click();

  await expect(page).toHaveURL(/\/en$/);
  const userId = await adoptUserByEmail(email);
  const { data, error } = await admin.from("profiles").select("locale").eq("id", userId).single();
  expect(error).toBeNull();
  expect(data?.locale).toBe("en");
});

test("an e-mail signup started with a returnTo lands on that page, signed in", async ({ page }) => {
  const email = `test-${randomUUID().slice(0, 8)}@example.test`;

  await page.goto("/fr/signup?returnTo=%2Ffr%2Fcollection");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Mot de passe").fill(randomUUID());
  await page.getByRole("button", { name: "S'inscrire" }).click();

  // requireUser sends a signed-out visitor back to the login: staying here proves the session.
  await expect(page).toHaveURL(/\/fr\/collection$/, { timeout: 20_000 });
  await adoptUserByEmail(email);
});

test("an e-mail signup whose hidden returnTo is forged lands on the home", async ({ page }) => {
  const email = `test-${randomUUID().slice(0, 8)}@example.test`;

  await page.goto("/fr/signup?returnTo=%2Ffr%2Fcollection");
  // The e-mail form is the one holding the password field.
  const emailForm = page.locator("form").filter({ has: page.getByLabel("Mot de passe") });
  await emailForm
    .locator('input[name="returnTo"]')
    .evaluate((input: HTMLInputElement) => (input.value = "//evil.com"), undefined, {
      timeout: 5_000,
    });
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Mot de passe").fill(randomUUID());
  await page.getByRole("button", { name: "S'inscrire" }).click();

  await expect(page).toHaveURL(/\/fr$/, { timeout: 20_000 });
  await adoptUserByEmail(email);
});
