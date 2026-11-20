import { randomUUID } from "node:crypto";
import { expect, test, type Locator } from "@playwright/test";
import {
  admin,
  boosterBySlug,
  cleanup,
  createCatalogCard,
  createPlayer,
  giveCoins,
  setShopSlot,
  waitForShopWindowMargin,
  type Player,
} from "../tests/integration/supabase";

// Uses the real "standard" and "premium" boosters. The test adds one displayable card so the
// catalogue is never empty: on an empty database (CI), every slot falls back to it; locally it
// simply joins the cards pulled from prod.
test.beforeAll(async () => {
  await createCatalogCard("common", `Carte E2E ${randomUUID().slice(0, 8)}`);
});

test.afterAll(cleanup);

// What a screen reader gets: the accessibility tree leaves out `aria-hidden` and visually hidden
// content, which `toContainText` (the DOM `textContent`) would count.
async function expectAccessibleText(locator: Locator, text: string) {
  await expect.poll(() => locator.ariaSnapshot()).toContain(text);
}

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

test("a player opens one emplacement of their shop offer, reveals the cards and finds them in their binder", async ({
  page,
}) => {
  // A cold `next dev` compiles /fr/boosters and the profile collection route on first visit.
  test.setTimeout(180_000);

  // The offer is read twice (by the test, then by the page): stay clear of a window change.
  await waitForShopWindowMargin(60);

  const player = await createPlayer();
  await giveCoins(player.id, 1000);
  const standard = await boosterBySlug("standard");
  const premium = await boosterBySlug("premium");

  // Slots 0 and 1 are standard, every other one is premium.
  const { data: offer, error } = await player.client.rpc("get_booster_shop_offer");
  if (error) throw error;
  const slotCount = (offer.slots as unknown[]).length;
  expect(slotCount).toBeGreaterThanOrEqual(3);
  for (let slotIndex = 0; slotIndex < slotCount; slotIndex++) {
    await setShopSlot(
      player.id,
      Number(offer.window_index),
      slotIndex,
      slotIndex < 2 ? standard.id : premium.id,
    );
  }

  await test.step("sign in", async () => {
    await page.goto("/fr/login");
    await page.getByLabel("E-mail").fill(player.email);
    await page.getByLabel("Mot de passe").fill(player.password);
    await page.getByRole("button", { name: "Se connecter" }).click();

    // Longer than the default 5 s: the login redirect is slow when the machine is loaded.
    await expect(page).toHaveURL(/\/fr$/, { timeout: 20_000 });
  });

  // The grid is the list of the page's main area, one item per emplacement, in slotIndex order.
  const emplacements = () => page.getByRole("main").getByRole("list").first().getByRole("listitem");
  const pack = (item: ReturnType<typeof emplacements>) => item.locator("[data-state]");
  const openButton = (item: ReturnType<typeof emplacements>) =>
    item.getByRole("button", { name: /Ouvrir/, disabled: false });

  await test.step("see the emplacements with their type, cost and card count", async () => {
    await page.goto("/fr/boosters");
    await expect(emplacements()).toHaveCount(slotCount);

    // Name and card count are one accessible text; the cost follows. All read from the accessibility tree.
    const first = emplacements().nth(0);
    await expectAccessibleText(first, `Booster standard, ${standard.slots} cartes`);
    await expectAccessibleText(first, `${standard.costCoins} pièces`);

    const third = emplacements().nth(2);
    await expectAccessibleText(third, `Booster premium, ${premium.slots} cartes`);
    await expectAccessibleText(third, `${premium.costCoins} pièces`);

    // The visible label is short; the accessible name keeps the type and the position.
    const button = first.getByRole("button", { name: "Ouvrir Booster standard, emplacement 1" });
    await expect(button).toHaveText("Ouvrir");
    await expect(pack(first)).toHaveAttribute("data-state", "idle");
  });

  await test.step("open the second emplacement and reveal the five cards", async () => {
    // Survives a client update, lost by a full page load.
    await page.evaluate(() => {
      (window as unknown as { __noReload: boolean }).__noReload = true;
    });

    await page.getByRole("button", { name: "Ouvrir Booster standard, emplacement 2" }).click();

    const reveal = page.getByRole("heading", { name: "Vos tirages" });
    await expect(reveal).toBeVisible();
    // Focus moves to the reveal (its heading or its section), which scrolls it into view.
    await expect
      .poll(() =>
        reveal.evaluate((heading) => {
          const active = document.activeElement;
          return active === heading || active === heading.closest("section");
        }),
      )
      .toBe(true);
    await expect(reveal).toBeInViewport();
    for (let card = 1; card <= standard.slots - 1; card++) {
      await page
        .getByRole("button", { name: `Carte suivante (${card}/${standard.slots})` })
        .click();
    }
    await expect(page.getByText("Booster ouvert !")).toBeVisible();
  });

  await test.step("see it exhausted, its sibling still available, without a reload", async () => {
    const opened = emplacements().nth(1);
    await expectAccessibleText(opened, "Épuisé");
    await expect(pack(opened)).toHaveAttribute("data-state", "exhausted");
    await expect(openButton(opened)).toHaveCount(0);

    await expect(emplacements().nth(0)).not.toContainText("Épuisé");
    await expect(openButton(emplacements().nth(0))).toHaveCount(1);

    expect(
      await page.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload),
    ).toBe(true);
  });

  await test.step("see the new balance in the header without a reload", async () => {
    await expect(page.getByTitle("850 pièces")).toBeVisible();
  });

  await test.step("find every drawn card in the binder", async () => {
    await page.getByRole("link", { name: "Voir mon classeur" }).click();
    await expect(page).toHaveURL(new RegExp(`/fr/players/${player.id}/collection`), {
      timeout: 20_000,
    });

    for (const name of await drawnCardNames(player)) {
      await expect(page.getByText(name).first()).toBeVisible();
    }
  });

  await test.step("find the emplacement still exhausted when coming back in the same window", async () => {
    await page.goto("/fr/boosters");
    await expect(emplacements()).toHaveCount(slotCount);
    await expectAccessibleText(emplacements().nth(1), "Épuisé");
    await expect(openButton(emplacements().nth(1))).toHaveCount(0);
  });
});
