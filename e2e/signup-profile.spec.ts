import { randomUUID } from "node:crypto";
import { expect, test } from "./fixtures";
import { waitForConfirmLink } from "../tests/integration/mailpit";
import { admin, adoptUserByEmail, cleanup } from "../tests/integration/supabase";

test.afterAll(cleanup);

test("a visitor signs up, confirms the e-mail, fills their public profile and sees it on their player page", async ({
  page,
}) => {
  const email = `test-${randomUUID().slice(0, 8)}@example.test`;
  const password = randomUUID();

  await test.step("sign up", async () => {
    await page.goto("/fr/signup");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Mot de passe").fill(password);
    await page.getByRole("button", { name: "S'inscrire" }).click();

    await expect(
      page.getByRole("status").filter({ hasText: /vérifiez votre boîte/i }),
    ).toBeVisible();
  });
  const userId = await adoptUserByEmail(email);

  await test.step("open the link of the confirmation mail", async () => {
    await page.goto(await waitForConfirmLink(email));
    await expect(page).toHaveURL(/\/fr$/);
  });

  await test.step("fill the public profile", async () => {
    await page.goto(`/fr/players/${userId}/settings`);
    await expect(page).toHaveURL(new RegExp(`/fr/players/${userId}/settings`));

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
  await test.step("open their public collection while signed out", async () => {
    await page.goto(`/fr/players/${userId}/collection`);
    await expect(page.getByText("Classeur de Testeur E2E")).toBeVisible();
  });
});

test("signing up in English asks to check the inbox and stores the English locale", async ({
  page,
}) => {
  const email = `test-${randomUUID().slice(0, 8)}@example.test`;

  await page.goto("/en/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(randomUUID());
  await page.getByRole("button", { name: "Sign up" }).click();

  await expect(page.getByRole("status").filter({ hasText: /check your inbox/i })).toBeVisible();
  // The profile exists from the sign-up, before any click.
  const userId = await adoptUserByEmail(email);
  const { data, error } = await admin.from("profiles").select("locale").eq("id", userId).single();
  expect(error).toBeNull();
  expect(data?.locale).toBe("en");
});

test("an e-mail signup started with a returnTo has no session until the link, which lands on that page", async ({
  page,
}) => {
  const email = `test-${randomUUID().slice(0, 8)}@example.test`;

  await page.goto("/fr/signup?returnTo=%2Ffr%2Fcollection");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Mot de passe").fill(randomUUID());
  await page.getByRole("button", { name: "S'inscrire" }).click();

  await expect(page.getByRole("status").filter({ hasText: /vérifiez votre boîte/i })).toBeVisible();
  await adoptUserByEmail(email);

  // requireUser sends a signed-out visitor back to the login: no session before the click.
  await page.goto("/fr/collection");
  await expect(page).toHaveURL(/\/fr\/login/);

  await page.goto(await waitForConfirmLink(email));
  await expect(page).toHaveURL(/\/fr\/collection$/, { timeout: 20_000 });
});

test("an e-mail signup whose hidden returnTo is forged lands on the home after the link, signed in", async ({
  page,
}) => {
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

  await expect(page.getByRole("status").filter({ hasText: /vérifiez votre boîte/i })).toBeVisible();
  await adoptUserByEmail(email);

  await page.goto(await waitForConfirmLink(email));
  await expect(page).toHaveURL(/\/fr$/, { timeout: 20_000 });
  // Signed in: the collection does not send us back to the login.
  await page.goto("/fr/collection");
  await expect(page).toHaveURL(/\/fr\/collection$/);
});
