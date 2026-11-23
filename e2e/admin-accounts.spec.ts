import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import {
  addTeamMember,
  cleanup,
  createAccountsWithoutSignIn,
  createPlayer,
  type Player,
} from "../tests/integration/supabase";

// The registry of registered accounts, read-only, as a team member sees it.
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

test("a super admin finds an account", async ({ page }) => {
  const token = randomUUID().replaceAll("-", "").slice(0, 10);
  const target = await createPlayer({ display_name: `Cible ${token}` });
  const staff = await createPlayer({ display_name: "Chef E2E" });
  await addTeamMember(staff.id, "super_admin");
  await signIn(page, staff);

  await page.goto("/fr/admin/accounts");
  await page.getByRole("searchbox", { name: "Rechercher par nom ou e-mail" }).fill(token);
  await page.getByRole("button", { name: "Rechercher" }).click();

  // The search lives in the URL.
  await expect(page).toHaveURL(new RegExp(`/fr/admin/accounts\\?q=${token}$`), { timeout: 20_000 });

  // Only the target carries the token: one row.
  const table = page.getByRole("table");
  const rows = table.locator("tbody tr");
  await expect(rows).toHaveCount(1);
  const row = rows.first();
  await expect(row.getByRole("rowheader")).toContainText(`Cible ${token}`);
  const cells = row.getByRole("cell");
  await expect(cells.nth(0)).toHaveText(target.email);
  await expect(cells.nth(1)).toHaveText(/^\d{1,2} \S+ \d{4}$/);
  await expect(cells.nth(2)).toHaveText(/^\d{1,2} \S+ \d{4}, \d{2}:\d{2}$/);
  await expect(cells.nth(3)).toHaveText("FR");
  await expect(cells.nth(4)).toHaveText("Public");

  // Newest first, said to assistive technology; the count is the search's.
  await expect(table.getByRole("columnheader", { name: "Inscription" })).toHaveAttribute(
    "aria-sort",
    "descending",
  );
  await expect(page.getByText("1 compte · consultation seule")).toBeVisible();

  // Read-only: nothing to click in the table.
  await expect(table.getByRole("link")).toHaveCount(0);
  await expect(table.getByRole("button")).toHaveCount(0);

  await test.step("on a phone, the table scrolls sideways and the name stays in view", async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    const name = row.getByRole("rowheader");
    const email = cells.nth(0);
    const scroller = await table.evaluateHandle((el) => {
      let node: HTMLElement | null = el.parentElement;
      while (node && node.scrollWidth <= node.clientWidth) node = node.parentElement;
      return node;
    });
    const canScroll = await scroller.evaluate((el) => el !== null);
    expect(canScroll).toBe(true);
    await name.scrollIntoViewIfNeeded();
    const nameBefore = await name.boundingBox();
    const emailBefore = await email.boundingBox();

    await scroller.evaluate((el) => {
      (el as HTMLElement).scrollLeft = 150;
    });

    await expect
      .poll(async () => (await email.boundingBox())!.x)
      .toBeLessThan(emailBefore!.x - 100);
    const nameAfter = await name.boundingBox();
    expect(Math.abs(nameAfter!.x - nameBefore!.x)).toBeLessThanOrEqual(1);
  });
});

test("a viewer sees masked e-mails and searches by name only", async ({ page }) => {
  const token = randomUUID().replaceAll("-", "").slice(0, 10);
  const target = await createPlayer({ display_name: `Cible ${token}` });
  const staff = await createPlayer({ display_name: "Lecteur E2E" });
  await addTeamMember(staff.id, "viewer");
  await signIn(page, staff);

  await page.goto(`/fr/admin/accounts?q=${token}`);

  await expect(page.getByText("E-mails masqués pour votre rôle", { exact: true })).toBeVisible({
    timeout: 20_000,
  });
  const search = page.getByRole("searchbox", { name: "Rechercher par nom affiché" });
  await expect(search).toBeVisible();

  const row = page.getByRole("table").locator("tbody tr");
  await expect(row).toHaveCount(1);
  await expect(row.getByRole("rowheader")).toContainText(`Cible ${token}`);
  await expect(row.getByRole("cell").nth(0)).toHaveText("t•••@e•••.test");

  // The browser never receives the clear e-mail: not in the HTML, flight payload included.
  const html = await (await page.request.get(`/fr/admin/accounts?q=${token}`)).text();
  expect(html).toContain("t•••@e•••.test");
  expect(html).not.toContain(target.email);

  // The e-mail is not searchable for this rôle.
  await search.fill(target.email);
  await page.getByRole("button", { name: "Rechercher" }).click();
  await expect(page.getByText("Aucun compte ne correspond à cette recherche.")).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByRole("table").getByRole("rowheader")).toHaveCount(0);
});

test("a moderator finds an account by its full e-mail, in clear", async ({ page }) => {
  const token = randomUUID().replaceAll("-", "").slice(0, 10);
  const target = await createPlayer({ display_name: `Cible ${token}` });
  const staff = await createPlayer({ display_name: "Modo E2E" });
  await addTeamMember(staff.id, "moderator");
  await signIn(page, staff);

  await page.goto("/fr/admin/accounts");
  const search = page.getByRole("searchbox", { name: "Rechercher par nom ou e-mail" });
  await search.fill(target.email);
  await page.getByRole("button", { name: "Rechercher" }).click();

  const row = page.getByRole("table").locator("tbody tr");
  await expect(row).toHaveCount(1, { timeout: 20_000 });
  await expect(row.getByRole("rowheader")).toContainText(`Cible ${token}`);
  await expect(row.getByRole("cell").nth(0)).toHaveText(target.email);
  await expect(page.getByText("E-mails masqués pour votre rôle")).toHaveCount(0);

  // A new search with Enter keeps the keyboard on the field: the page must not remount it.
  await search.fill(token);
  await search.press("Enter");
  await expect(page).toHaveURL(new RegExp(`/fr/admin/accounts\\?q=${token}$`), { timeout: 20_000 });
  await expect(row).toHaveCount(1);
  await expect(row.getByRole("rowheader")).toContainText(`Cible ${token}`);
  await expect(search).toBeFocused();
});

test("a super admin pages through a search", async ({ page }) => {
  test.setTimeout(300_000);

  const token = randomUUID().replaceAll("-", "").slice(0, 10);
  await createAccountsWithoutSignIn(51, (index) => ({
    display_name: `Page ${token} ${String(index + 1).padStart(2, "0")}`,
  }));
  const staff = await createPlayer({ display_name: "Chef E2E" });
  await addTeamMember(staff.id, "super_admin");
  await signIn(page, staff);

  await page.goto(`/fr/admin/accounts?q=${token}`);

  const rows = page.getByRole("table").locator("tbody tr");
  await expect(rows).toHaveCount(50, { timeout: 20_000 });
  await expect(page.getByText("1–50 sur 51 comptes", { exact: true })).toBeVisible();
  await expect(page.getByText("Page 1 sur 2", { exact: true })).toBeVisible();
  await expect(page.getByText("Précédent", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Précédent" })).toHaveCount(0);

  // Text typed and not submitted does not outlive a page change: the field follows the URL.
  await page.getByRole("searchbox").fill("texte non envoyé");
  await page.getByRole("link", { name: "Suivant" }).click();

  await expect(page).toHaveURL(new RegExp(`/fr/admin/accounts\\?q=${token}&page=2$`), {
    timeout: 20_000,
  });
  await expect(rows).toHaveCount(1);
  await expect(rows.first().getByRole("cell").nth(2)).toHaveText("Jamais");
  await expect(page.getByText("51–51 sur 51 comptes", { exact: true })).toBeVisible();
  await expect(page.getByRole("searchbox")).toHaveValue(token);
  await expect(page.getByRole("link", { name: "Suivant" })).toHaveCount(0);

  await test.step("a page past the last one goes to the last page", async () => {
    await page.goto(`/fr/admin/accounts?q=${token}&page=9`);
    await expect(page).toHaveURL(new RegExp(`/fr/admin/accounts\\?q=${token}&page=2$`), {
      timeout: 20_000,
    });
  });

  await test.step("on a phone, the footer is one line", async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(
      page.getByText("51–51 sur 51 comptes · page 2 sur 2", { exact: true }),
    ).toBeVisible();
  });
});
