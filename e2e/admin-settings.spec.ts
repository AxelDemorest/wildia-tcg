import { expect, test, type Page } from "@playwright/test";
import {
  addTeamMember,
  admin,
  cleanup,
  createPlayer,
  economyConfigValue,
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

const frNumber = (value: number) => new Intl.NumberFormat("fr").format(value);

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

  try {
    await arrangeMultiplierChange(staff.id, m0 === 1.5 ? 2 : 1.5);
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
  } finally {
    await setEconomyConfigValue("farm_global_multiplier", m0);
  }
});
