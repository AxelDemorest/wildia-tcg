import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import {
  admin,
  balanceOf,
  cleanup,
  createCatalogCard,
  createPlayer,
  giveCoins,
  type Player,
} from "../tests/integration/supabase";

// Uses the real "standard" booster. The test adds one displayable card so the catalogue is
// never empty: on an empty database (CI), every slot falls back to it; locally it simply
// joins the cards pulled from prod.
test.beforeAll(async () => {
  await createCatalogCard("common", `Carte E2E ${randomUUID().slice(0, 8)}`);
});

test.afterAll(cleanup);

async function drawnCardNames(player: Player): Promise<string[]> {
  const { data, error } = await admin
    .from("user_cards")
    .select("card_id, cards ( card_translations ( locale, name ) )")
    .eq("user_id", player.id);
  if (error) throw error;
  return data.map((row) => {
    const card = row.cards as unknown as { card_translations: { locale: string; name: string }[] };
    return card.card_translations.find((t) => t.locale === "fr")!.name;
  });
}

test("a player opens a standard booster, reveals the cards and finds them in their binder", async ({
  page,
}) => {
  const player = await createPlayer();
  await giveCoins(player.id, 1000);

  await test.step("sign in", async () => {
    await page.goto("/fr/login");
    await page.getByLabel("E-mail").fill(player.email);
    await page.getByLabel("Mot de passe").fill(player.password);
    await page.getByRole("button", { name: "Se connecter" }).click();

    await expect(page).toHaveURL(/\/fr$/);
  });

  await test.step("open the booster and reveal the five cards", async () => {
    await page.goto("/fr/boosters");
    await page
      .getByRole("button", { name: /Booster standard/ })
      .first()
      .click();
    await page.getByRole("button", { name: "Ouvrir Booster standard" }).click();

    await expect(page.getByRole("heading", { name: "Vos tirages" })).toBeVisible();
    for (let card = 1; card <= 4; card++) {
      await page.getByRole("button", { name: `Carte suivante (${card}/5)` }).click();
    }
    await expect(page.getByText("Booster ouvert !")).toBeVisible();
  });

  expect(await balanceOf(player.id)).toBe(850);

  await test.step("find every drawn card in the binder", async () => {
    await page.getByRole("link", { name: "Voir mon classeur" }).click();
    await expect(page).toHaveURL(/\/fr\/collection/);

    for (const name of await drawnCardNames(player)) {
      await expect(page.getByText(name).first()).toBeVisible();
    }
  });
});
