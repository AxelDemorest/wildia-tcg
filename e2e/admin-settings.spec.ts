import { expect, test, type Page } from "./fixtures";
import {
  addTeamMember,
  admin,
  boosterBySlug,
  cleanup,
  createPlayer,
  economyConfigValue,
  setBoosterDefinition,
  setEconomyConfigValue,
  type Player,
} from "../tests/integration/supabase";

// The settings page of the espace administration (CYR-117): a super administrator changes the
// global farm multiplier and finds the change in the history. economy_config is global: each
// test puts back what it changed. The history rows of the test accounts go away in cleanup().
test.afterAll(cleanup);

// A cold `next dev` compiles the routes on first visit.
test.beforeEach(() => {
  test.setTimeout(120_000);
});

async function signIn(page: Page, player: Player) {
  await page.goto("/fr/login");
  await page.getByLabel("E-mail").fill(player.email);
  await page.getByLabel("Mot de passe").fill(player.password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  // Longer than the default 5 s: the login redirect is slow when the machine is loaded.
  await expect(page).toHaveURL(/\/fr$/, { timeout: 20_000 });
}

const adminNav = (page: Page) => page.getByRole("navigation", { name: "Espace administration" });

/** The card (a section) whose h2 is exactly this text. */
const card = (page: Page, heading: string) =>
  page.locator("section").filter({
    has: page.getByRole("heading", { level: 2, name: heading, exact: true }),
  });

/** The card (an article) of a booster, named by its h3. */
const boosterCard = (page: Page, name: string) => page.getByRole("article", { name, exact: true });

const frNumber = (value: number) => new Intl.NumberFormat("fr").format(value);

/** A share as the page writes it in French: one decimal at most, "0 %" for a total of 0. */
const frShare = (part: number, total: number) =>
  new Intl.NumberFormat("fr", { style: "percent", maximumFractionDigits: 1 }).format(
    total > 0 ? part / total : 0,
  );

const FR_RARITIES = ["Commune", "Peu commune", "Rare", "Épique", "Légendaire", "Mythique"];
const EN_RARITIES = ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Mythic"];

type BoosterSnapshot = Awaited<ReturnType<typeof boosterBySlug>>;

/** Every value of the two real boosters, to put them back (they are global to the database). */
async function snapshotBoosters() {
  return { standard: await boosterBySlug("standard"), premium: await boosterBySlug("premium") };
}

async function putBoosterBack(slug: string, values: BoosterSnapshot): Promise<void> {
  await setBoosterDefinition(slug, {
    costCoins: values.costCoins,
    slots: values.slots,
    shopWeight: values.shopWeight,
    isActive: values.isActive,
    rarityWeights: values.rarityWeights,
  });
}

/** The values of the validated mockup (Standard 150 coins, weight 70; Premium 500, weight 30). */
async function setMockupValues(): Promise<void> {
  await setBoosterDefinition("standard", {
    costCoins: 150,
    slots: 5,
    shopWeight: 70,
    isActive: true,
    rarityWeights: { common: 55, uncommon: 28, rare: 12, epic: 4, legendary: 1, mythic: 0 },
  });
  await setBoosterDefinition("premium", {
    costCoins: 500,
    slots: 5,
    shopWeight: 30,
    isActive: true,
    rarityWeights: { common: 35, uncommon: 30, rare: 20, epic: 10, legendary: 5, mythic: 0 },
  });
}

/** How many history rows an author wrote: a refused change writes none. */
async function changeCount(authorId: string): Promise<number> {
  const { count, error } = await admin
    .from("admin_setting_changes")
    .select("*", { count: "exact", head: true })
    .eq("author_id", authorId);
  if (error) throw error;
  return count ?? 0;
}

const NO_BOOSTER_LEFT =
  "Au moins un booster doit rester actif, avec un poids boutique supérieur à 0.";

test("a super administrator changes the farm multiplier", async ({ page }) => {
  const staff = await createPlayer({ display_name: "Chef E2E" });
  await addTeamMember(staff.id, "super_admin");
  await signIn(page, staff);
  const m0 = await economyConfigValue("farm_global_multiplier");
  const m1 = m0 === 1.5 ? 2 : 1.5;

  try {
    await page.goto("/fr/admin");
    const link = adminNav(page).getByRole("link", { name: "Paramètres" });
    await expect(link).toHaveAttribute("href", "/fr/admin/settings", { timeout: 20_000 });
    await link.click();

    await expect(page).toHaveURL(/\/fr\/admin\/settings$/, { timeout: 20_000 });
    await expect(link).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("heading", { level: 1, name: "Paramètres" })).toBeVisible();
    await expect(
      page.getByText(
        "Réglages du jeu. Chaque changement s’applique tout de suite à tous les joueurs.",
      ),
    ).toBeVisible();
    await expect(page).toHaveTitle("Paramètres · Espace administration");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex, nofollow",
    );

    const economy = card(page, "Économie");
    const multiplier = economy.getByRole("spinbutton", { name: "Multiplicateur du farm" });
    await expect(multiplier).toHaveValue(String(m0));
    await expect(multiplier).toHaveAccessibleDescription(/Entre 0 et 5\./);

    await multiplier.fill(String(m1));
    await economy.getByRole("button", { name: "Enregistrer" }).click();

    await expect(economy.getByRole("status")).toHaveText("Enregistré", { timeout: 20_000 });
    await expect.poll(() => economyConfigValue("farm_global_multiplier")).toBe(m1);

    // The change is the newest row of the history, under the cards.
    const first = page.getByRole("table").locator("tbody tr").first();
    const cells = first.locator("td, th");
    await expect(cells.nth(0)).toHaveText(/^\d{1,2} \S+ \d{4}, \d{2}:\d{2}$/, { timeout: 20_000 });
    await expect(cells.nth(1)).toHaveText("Chef E2E");
    await expect(cells.nth(2)).toHaveText("Multiplicateur du farm");
    await expect(cells.nth(3)).toHaveText(frNumber(m0));
    await expect(cells.nth(4)).toHaveText(frNumber(m1));
    await expect(first.getByText("Restauration")).toHaveCount(0);
  } finally {
    await setEconomyConfigValue("farm_global_multiplier", m0);
  }
});

/** Arranges a history row through the service role, as the server writes it: M0 -> M1 by `author`. */
async function arrangeMultiplierChange(authorId: string, to: number): Promise<void> {
  const { error } = await admin.rpc("admin_set_economy_config", {
    p_key: "farm_global_multiplier",
    p_value: to,
    p_author_id: authorId,
    p_restored_from: null,
  });
  if (error) throw error;
}

const firstRow = (page: Page) => page.getByRole("table").locator("tbody tr").first();

test("a super administrator restores a change after confirming", async ({ page }) => {
  const staff = await createPlayer({ display_name: "Chef E2E" });
  await addTeamMember(staff.id, "super_admin");
  await signIn(page, staff);
  const m0 = await economyConfigValue("farm_global_multiplier");
  const m1 = m0 === 1.5 ? 2 : 1.5;

  try {
    await arrangeMultiplierChange(staff.id, m1);
    await page.goto("/fr/admin/settings");

    const restoreButton = firstRow(page).getByRole("button", {
      name: `Restaurer Multiplicateur du farm à ${frNumber(m0)}`,
    });
    await expect(restoreButton).toBeVisible({ timeout: 20_000 });
    await restoreButton.click();

    const dialog = page.getByRole("dialog", { name: "Restaurer cette valeur ?" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Annuler" })).toBeFocused();
    await expect(dialog).toContainText(`passera de ${frNumber(m1)} à ${frNumber(m0)}`);

    await dialog.getByRole("button", { name: "Annuler" }).click();
    await expect(dialog).toBeHidden();
    expect(await economyConfigValue("farm_global_multiplier")).toBe(m1);

    await restoreButton.click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Restaurer", exact: true }).click();
    await expect(dialog).toBeHidden({ timeout: 20_000 });
    await expect.poll(() => economyConfigValue("farm_global_multiplier")).toBe(m0);
    await expect(
      card(page, "Économie").getByRole("spinbutton", { name: "Multiplicateur du farm" }),
    ).toHaveValue(String(m0));

    const restored = firstRow(page).locator("td, th");
    await expect(restored.nth(2)).toContainText("Multiplicateur du farm", { timeout: 20_000 });
    await expect(restored.nth(2)).toContainText("Restauration");
    await expect(restored.nth(3)).toHaveText(frNumber(m1));
    await expect(restored.nth(4)).toHaveText(frNumber(m0));
    await expect(restored.nth(1)).toHaveText("Chef E2E");

    const arranged = page.getByRole("table").locator("tbody tr").nth(1).locator("td, th");
    await expect(arranged.nth(2)).toContainText("Multiplicateur du farm");
    await expect(arranged.nth(2)).not.toContainText("Restauration");
    await expect(arranged.nth(3)).toHaveText(frNumber(m0));
    await expect(arranged.nth(4)).toHaveText(frNumber(m1));
  } finally {
    await setEconomyConfigValue("farm_global_multiplier", m0);
  }
});

test("a moderator has no Paramètres entry and is sent to the admin home", async ({ page }) => {
  const moderator = await createPlayer({ display_name: "Modo E2E" });
  await addTeamMember(moderator.id, "moderator");
  await signIn(page, moderator);

  await page.goto("/fr/admin");
  await expect(page.getByRole("heading", { level: 1, name: "Accueil" })).toBeVisible({
    timeout: 20_000,
  });
  await expect(adminNav(page).getByRole("link", { name: "Paramètres" })).toHaveCount(0);

  await page.goto("/fr/admin/settings");
  await expect(page).toHaveURL(/\/fr\/admin$/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { level: 1, name: "Accueil" })).toBeVisible();

  const response = await page.request.get("/fr/admin/settings", { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(new URL(response.headers()["location"], "http://localhost").pathname).toBe("/fr/admin");
  const body = await response.text();
  expect(body).not.toContain("Paramètres · Espace administration");
  expect(body).not.toContain("Multiplicateur du farm");
});

test("an out-of-bounds multiplier is refused; the Boutique card saves the emplacements", async ({
  page,
}) => {
  const staff = await createPlayer({ display_name: "Chef E2E" });
  await addTeamMember(staff.id, "super_admin");
  await signIn(page, staff);
  const m0 = await economyConfigValue("farm_global_multiplier");
  const s0 = await economyConfigValue("booster_shop_slot_count");
  const s1 = s0 === 6 ? 7 : 6;

  try {
    await page.goto("/fr/admin/settings");

    const economy = card(page, "Économie");
    const multiplier = economy.getByRole("spinbutton", { name: "Multiplicateur du farm" });
    await multiplier.fill("8");
    await economy.getByRole("button", { name: "Enregistrer" }).click();

    await expect(
      economy.getByText("Le multiplicateur doit être compris entre 0 et 5."),
    ).toBeVisible({ timeout: 20_000 });
    await expect(multiplier).toHaveAttribute("aria-invalid", "true");
    await expect(multiplier).toHaveCSS("border-color", "rgb(180, 35, 24)");
    await expect(multiplier).toHaveValue("8");
    expect(await economyConfigValue("farm_global_multiplier")).toBe(m0);
    const { count, error } = await admin
      .from("admin_setting_changes")
      .select("*", { count: "exact", head: true })
      .eq("author_id", staff.id);
    if (error) throw error;
    expect(count).toBe(0);

    const shop = card(page, "Boutique");
    await shop.getByRole("spinbutton", { name: "Emplacements par offre" }).fill(String(s1));
    await shop.getByRole("button", { name: "Enregistrer" }).click();

    await expect(shop.getByRole("status")).toHaveText("Enregistré", { timeout: 20_000 });
    await expect.poll(() => economyConfigValue("booster_shop_slot_count")).toBe(s1);
    const cells = firstRow(page).locator("td, th");
    await expect(cells.nth(2)).toHaveText("Emplacements par offre", { timeout: 20_000 });
    await expect(cells.nth(3)).toHaveText(frNumber(s0));
    await expect(cells.nth(4)).toHaveText(frNumber(s1));
  } finally {
    await setEconomyConfigValue("farm_global_multiplier", m0);
    await setEconomyConfigValue("booster_shop_slot_count", s0);
  }
});

test("on a phone and in English", async ({ page }) => {
  const staff = await createPlayer({ display_name: "Chef E2E" });
  await addTeamMember(staff.id, "super_admin");
  await signIn(page, staff);
  const m0 = await economyConfigValue("farm_global_multiplier");
  const premium0 = (await boosterBySlug("premium")).costCoins;

  try {
    await arrangeMultiplierChange(staff.id, m0 === 1.5 ? 2 : 1.5);
    // The newest row of the history: Premium's price, for the English labels below.
    const arranged = await admin.rpc("admin_set_booster_definition", {
      p_slug: "premium",
      p_changes: { cost_coins: premium0 === 450 ? 460 : 450 },
      p_author_id: staff.id,
      p_restored_from: null,
    });
    if (arranged.error) throw arranged.error;
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/fr/admin/settings");

    await expect(page.getByRole("heading", { level: 1, name: "Paramètres" })).toBeVisible({
      timeout: 20_000,
    });
    const economyBox = await card(page, "Économie").boundingBox();
    const shopBox = await card(page, "Boutique").boundingBox();
    expect(economyBox).not.toBeNull();
    expect(shopBox).not.toBeNull();
    expect(shopBox!.x).toBeCloseTo(economyBox!.x, 0);
    expect(shopBox!.width).toBeCloseTo(economyBox!.width, 0);
    expect(shopBox!.y).toBeGreaterThanOrEqual(economyBox!.y + economyBox!.height - 1);

    // The booster cards are stacked, as wide as each other, inside the screen.
    const standardBox = await boosterCard(page, "Standard").boundingBox();
    const premiumBox = await boosterCard(page, "Premium").boundingBox();
    expect(standardBox).not.toBeNull();
    expect(premiumBox).not.toBeNull();
    expect(premiumBox!.x).toBeCloseTo(standardBox!.x, 0);
    expect(premiumBox!.width).toBeCloseTo(standardBox!.width, 0);
    expect(premiumBox!.y).toBeGreaterThanOrEqual(standardBox!.y + standardBox!.height - 1);
    expect(standardBox!.x + standardBox!.width).toBeLessThanOrEqual(390);

    const scrolls = await page.getByRole("table").evaluate((el) => {
      const scroller = el.parentElement as HTMLElement;
      return scroller.scrollWidth > scroller.clientWidth;
    });
    expect(scrolls).toBe(true);
    const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(pageWidth).toBeLessThanOrEqual(390);

    await firstRow(page)
      .getByRole("button", { name: /^Restaurer / })
      .click();
    const dialog = page.getByRole("dialog", { name: "Restaurer cette valeur ?" });
    await expect(dialog).toBeVisible();
    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    await dialog.getByRole("button", { name: "Annuler" }).click();
    await expect(dialog).toBeHidden();

    await page.goto("/en/admin/settings");
    await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      page
        .getByRole("navigation", { name: "Admin area" })
        .getByRole("link", { name: "Settings", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Economy" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Shop" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Settings history" })).toBeVisible();
    await expect(page.getByRole("spinbutton", { name: "Farm multiplier" })).toBeVisible();

    await expect(
      page.getByRole("heading", { level: 2, name: "Boosters", exact: true }),
    ).toBeVisible();
    const premiumCard = boosterCard(page, "Premium");
    await expect(premiumCard.getByRole("switch", { name: "Active" })).toBeVisible();
    await expect(premiumCard.getByRole("spinbutton", { name: "Price", exact: true })).toBeVisible();
    for (const label of EN_RARITIES) {
      await expect(premiumCard.getByRole("spinbutton", { name: label, exact: true })).toBeVisible();
    }
    await expect(
      page.getByRole("cell", { name: "Premium · price", exact: true }).first(),
    ).toBeVisible();
  } finally {
    await setEconomyConfigValue("farm_global_multiplier", m0);
    await setBoosterDefinition("premium", { costCoins: premium0 });
  }
});

test("a super administrator changes the Premium price, then restores it", async ({ page }) => {
  const staff = await createPlayer({ display_name: "Chef E2E" });
  await addTeamMember(staff.id, "super_admin");
  await signIn(page, staff);
  const before = await boosterBySlug("premium");
  const p0 = before.costCoins;
  const p1 = p0 === 450 ? 460 : 450;

  try {
    await page.goto("/fr/admin/settings");

    const premium = boosterCard(page, "Premium");
    const price = premium.getByRole("spinbutton", { name: "Prix", exact: true });
    await expect(price).toHaveValue(String(p0), { timeout: 20_000 });

    await price.fill(String(p1));
    await premium.getByRole("button", { name: "Enregistrer" }).click();

    await expect(premium.getByRole("status")).toHaveText("Enregistré", { timeout: 20_000 });
    await expect.poll(async () => (await boosterBySlug("premium")).costCoins).toBe(p1);
    const cells = firstRow(page).locator("td, th");
    await expect(cells.nth(2)).toHaveText("Premium · prix", { timeout: 20_000 });
    await expect(cells.nth(3)).toHaveText(frNumber(p0));
    await expect(cells.nth(4)).toHaveText(frNumber(p1));

    await firstRow(page)
      .getByRole("button", { name: `Restaurer Premium · prix à ${frNumber(p0)}` })
      .click();
    const dialog = page.getByRole("dialog", { name: "Restaurer cette valeur ?" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(
      `Le prix du booster Premium passera de ${frNumber(p1)} à ${frNumber(p0)} pièces.`,
    );

    await dialog.getByRole("button", { name: "Restaurer", exact: true }).click();
    await expect(dialog).toBeHidden({ timeout: 20_000 });
    await expect.poll(async () => (await boosterBySlug("premium")).costCoins).toBe(p0);
    await expect(price).toHaveValue(String(p0));
    const restored = firstRow(page).locator("td, th");
    await expect(restored.nth(2)).toContainText("Premium · prix", { timeout: 20_000 });
    await expect(restored.nth(2)).toContainText("Restauration");
    await expect(restored.nth(3)).toHaveText(frNumber(p1));
    await expect(restored.nth(4)).toHaveText(frNumber(p0));
  } finally {
    await setBoosterDefinition("premium", { costCoins: p0 });
  }
});

test("the Boosters section shows the mockup's values, and saving a card updates the totals and the history", async ({
  page,
}) => {
  const staff = await createPlayer({ display_name: "Chef E2E" });
  await addTeamMember(staff.id, "super_admin");
  await signIn(page, staff);
  const original = await snapshotBoosters();

  try {
    await setMockupValues();
    await page.goto("/fr/admin/settings");

    await expect(
      page.getByRole("heading", { level: 2, name: "Boosters", exact: true }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByText(
        "Les chances sont relatives : une rareté à 55 sur un total de 100 sort 55 fois sur 100.",
      ),
    ).toBeVisible();
    const headings = await page
      .getByRole("article")
      .getByRole("heading", { level: 3 })
      .allTextContents();
    expect(headings).toEqual(["Standard", "Premium"]);

    const standard = boosterCard(page, "Standard");
    const premium = boosterCard(page, "Premium");
    const mockup = [
      { card: standard, price: "150", weight: "70", chances: [55, 28, 12, 4, 1, 0], share: "70" },
      { card: premium, price: "500", weight: "30", chances: [35, 30, 20, 10, 5, 0], share: "30" },
    ];
    for (const { card: booster, price, weight, chances, share } of mockup) {
      await expect(booster.getByRole("switch", { name: "Actif" })).toHaveAttribute(
        "aria-checked",
        "true",
      );
      await expect(booster.getByRole("spinbutton", { name: "Prix", exact: true })).toHaveValue(
        price,
      );
      await expect(booster.getByRole("spinbutton", { name: "Cartes par booster" })).toHaveValue(
        "5",
      );
      await expect(booster.getByRole("spinbutton", { name: "Poids boutique" })).toHaveValue(weight);
      await expect(booster.getByText(`${share} % des emplacements`)).toBeVisible();
      // Each chance's percentage is the description of its field.
      const total = chances.reduce((sum, chance) => sum + chance, 0);
      for (const [index, label] of FR_RARITIES.entries()) {
        const field = booster.getByRole("spinbutton", { name: label, exact: true });
        await expect(field).toHaveValue(String(chances[index]));
        await expect(field).toHaveAccessibleDescription(frShare(chances[index], total));
      }
      await expect(booster.getByText("Total des chances : 100")).toBeVisible();
    }

    // Standard: 6 cards, Rare 12 -> 20, switched off.
    await standard.getByRole("spinbutton", { name: "Cartes par booster" }).fill("6");
    await standard.getByRole("spinbutton", { name: "Rare", exact: true }).fill("20");
    await standard.getByRole("switch", { name: "Actif" }).click();
    await standard.getByRole("button", { name: "Enregistrer" }).click();

    await expect(standard.getByRole("status")).toHaveText("Enregistré", { timeout: 20_000 });
    await expect
      .poll(() => boosterBySlug("standard"))
      .toMatchObject({
        slots: 6,
        isActive: false,
        rarityWeights: { rare: 20 },
      });
    // The total and the percentages follow the values saved: 55 + 28 + 20 + 4 + 1 = 108.
    await expect(standard.getByText("Total des chances : 108")).toBeVisible({ timeout: 20_000 });
    await expect(
      standard.getByRole("spinbutton", { name: "Rare", exact: true }),
    ).toHaveAccessibleDescription(frShare(20, 108));
    await expect(
      standard.getByRole("spinbutton", { name: "Commune", exact: true }),
    ).toHaveAccessibleDescription(frShare(55, 108));
    await expect(standard.getByRole("switch", { name: "Actif" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    // A booster that is off leaves the emplacements to the others.
    await expect(standard.getByText("0 % des emplacements")).toBeVisible();
    await expect(premium.getByText("100 % des emplacements")).toBeVisible();

    const rows = page.getByRole("table").locator("tbody tr");
    const rowOf = (label: string) =>
      rows.filter({ has: page.getByRole("cell", { name: label, exact: true }) });
    const cells = (label: string) => rowOf(label).first().locator("td, th");
    await expect(cells("Standard · cartes").nth(3)).toHaveText("5", { timeout: 20_000 });
    await expect(cells("Standard · cartes").nth(4)).toHaveText("6");
    await expect(cells("Standard · chances Rare").nth(3)).toHaveText("12");
    await expect(cells("Standard · chances Rare").nth(4)).toHaveText("20");
    await expect(cells("Standard · actif").nth(3)).toHaveText("Oui");
    await expect(cells("Standard · actif").nth(4)).toHaveText("Non");
    // Nothing else changed: no row for the unchanged values.
    expect(await changeCount(staff.id)).toBe(3);
  } finally {
    await putBoosterBack("standard", original.standard);
    await putBoosterBack("premium", original.premium);
  }
});

test("a refused price is shown under the field, and nothing is written", async ({ page }) => {
  const staff = await createPlayer({ display_name: "Chef E2E" });
  await addTeamMember(staff.id, "super_admin");
  await signIn(page, staff);
  const original = await snapshotBoosters();

  try {
    await page.goto("/fr/admin/settings");
    const premium = boosterCard(page, "Premium");
    const price = premium.getByRole("spinbutton", { name: "Prix", exact: true });
    await expect(price).toBeVisible({ timeout: 20_000 });

    await price.fill("0");
    await premium.getByRole("button", { name: "Enregistrer" }).click();

    await expect(
      premium.getByText("Le prix doit être un entier compris entre 1 et 100 000."),
    ).toBeVisible({ timeout: 20_000 });
    await expect(price).toHaveAttribute("aria-invalid", "true");
    await expect(price).toHaveCSS("border-color", "rgb(180, 35, 24)");
    await expect(price).toHaveValue("0");
    expect((await boosterBySlug("premium")).costCoins).toBe(original.premium.costCoins);
    expect(await changeCount(staff.id)).toBe(0);
  } finally {
    await putBoosterBack("premium", original.premium);
  }
});

test("six chances at 0 are refused with a message under the chances, and nothing is written", async ({
  page,
}) => {
  const staff = await createPlayer({ display_name: "Chef E2E" });
  await addTeamMember(staff.id, "super_admin");
  await signIn(page, staff);
  const original = await snapshotBoosters();

  try {
    await page.goto("/fr/admin/settings");
    const standard = boosterCard(page, "Standard");
    await expect(standard).toBeVisible({ timeout: 20_000 });

    for (const label of FR_RARITIES) {
      await standard.getByRole("spinbutton", { name: label, exact: true }).fill("0");
    }
    await standard.getByRole("button", { name: "Enregistrer" }).click();

    await expect(standard.getByText("Au moins une chance doit être supérieure à 0.")).toBeVisible({
      timeout: 20_000,
    });
    expect(await boosterBySlug("standard")).toMatchObject({
      rarityWeights: original.standard.rarityWeights,
    });
    expect(await changeCount(staff.id)).toBe(0);
  } finally {
    await putBoosterBack("standard", original.standard);
  }
});

test("the last available booster cannot be switched off: the card says so and nothing is written", async ({
  page,
}) => {
  const staff = await createPlayer({ display_name: "Chef E2E" });
  await addTeamMember(staff.id, "super_admin");
  await signIn(page, staff);
  const original = await snapshotBoosters();

  try {
    await setMockupValues();
    await setBoosterDefinition("standard", { isActive: false });
    await page.goto("/fr/admin/settings");

    // An inactive booster stays listed, so it can be switched on again.
    const standard = boosterCard(page, "Standard");
    await expect(standard.getByRole("switch", { name: "Actif" })).toHaveAttribute(
      "aria-checked",
      "false",
      { timeout: 20_000 },
    );

    const premium = boosterCard(page, "Premium");
    await premium.getByRole("switch", { name: "Actif" }).click();
    await premium.getByRole("button", { name: "Enregistrer" }).click();

    await expect(premium.getByText(NO_BOOSTER_LEFT)).toBeVisible({ timeout: 20_000 });
    expect((await boosterBySlug("premium")).isActive).toBe(true);
    expect(await changeCount(staff.id)).toBe(0);
  } finally {
    await putBoosterBack("standard", original.standard);
    await putBoosterBack("premium", original.premium);
  }
});

test("restoring a value that would empty the shop is refused in the dialog, which stays open", async ({
  page,
}) => {
  const staff = await createPlayer({ display_name: "Chef E2E" });
  await addTeamMember(staff.id, "super_admin");
  await signIn(page, staff);
  const original = await snapshotBoosters();

  try {
    await setMockupValues();
    // The row "Premium · poids boutique 0 -> 30", then Standard switched off: restoring the row
    // would leave no booster available.
    await setBoosterDefinition("premium", { shopWeight: 0 });
    const { error } = await admin.rpc("admin_set_booster_definition", {
      p_slug: "premium",
      p_changes: { shop_weight: 30 },
      p_author_id: staff.id,
      p_restored_from: null,
    });
    if (error) throw error;
    await setBoosterDefinition("standard", { isActive: false });
    await page.goto("/fr/admin/settings");

    await firstRow(page)
      .getByRole("button", { name: "Restaurer Premium · poids boutique à 0" })
      .click({ timeout: 20_000 });
    const dialog = page.getByRole("dialog", { name: "Restaurer cette valeur ?" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Restaurer", exact: true }).click();

    await expect(dialog.getByText(NO_BOOSTER_LEFT)).toBeVisible({ timeout: 20_000 });
    await expect(dialog).toBeVisible();
    expect((await boosterBySlug("premium")).shopWeight).toBe(30);
    // Only the row arranged above: the refused restore wrote none.
    expect(await changeCount(staff.id)).toBe(1);
  } finally {
    await putBoosterBack("standard", original.standard);
    await putBoosterBack("premium", original.premium);
  }
});
