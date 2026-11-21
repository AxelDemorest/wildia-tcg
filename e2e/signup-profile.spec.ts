import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { adoptUserByEmail, cleanup } from "../tests/integration/supabase";

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