import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "./fixtures";
import {
  addTeamMember,
  cleanup,
  coinGrantsBy,
  createAccountsWithoutSignIn,
  createPlayer,
  deletePlayer,
  giveCoins,
  ledgerOf,
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
  await expect(page.getByText("1 compte", { exact: true })).toBeVisible();

  // The super admin's only action on a row: adding coins. No link.
  await expect(table.getByRole("link")).toHaveCount(0);
  await expect(table.getByRole("button")).toHaveCount(1);
  await expect(
    row.getByRole("button", { name: `Ajouter des pièces à Cible ${token}` }),
  ).toBeVisible();

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

  // Read-only for this rôle: no button in the table.
  await page.goto(`/fr/admin/accounts?q=${token}`);
  await expect(page.getByRole("table").locator("tbody tr")).toHaveCount(1, { timeout: 20_000 });
  await expect(page.getByRole("table").getByRole("button")).toHaveCount(0);
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

  // Read-only for this rôle: no button in the table, and the subtitle says so.
  await expect(page.getByRole("table").getByRole("button")).toHaveCount(0);
  await expect(page.getByText("1 compte · consultation seule")).toBeVisible();

  // A new search with Enter keeps the keyboard on the field: the page must not remount it.
  await search.fill(token);
  await search.press("Enter");
  await expect(page).toHaveURL(new RegExp(`/fr/admin/accounts\\?q=${token}$`), { timeout: 20_000 });
  await expect(row).toHaveCount(1);
  await expect(row.getByRole("rowheader")).toContainText(`Cible ${token}`);
  await expect(search).toBeFocused();
});

test("a super admin adds coins to an account", async ({ page }) => {
  const token = randomUUID().replaceAll("-", "").slice(0, 10);
  const target = await createPlayer({ display_name: `Cible ${token}` });
  const staff = await createPlayer({ display_name: "Chef E2E" });
  await addTeamMember(staff.id, "super_admin");
  await signIn(page, staff);

  await page.goto(`/fr/admin/accounts?q=${token}`);

  const row = page.getByRole("table").locator("tbody tr");
  await expect(row).toHaveCount(1, { timeout: 20_000 });
  await row.getByRole("button", { name: `Ajouter des pièces à Cible ${token}` }).click();

  const dialog = page.getByRole("dialog", { name: "Ajouter des pièces" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(`Cible ${token}`);
  await dialog.getByLabel("Montant").fill("500");
  await dialog.getByRole("button", { name: "Ajouter", exact: true }).click();

  await expect(dialog).toBeHidden({ timeout: 20_000 });
  // Success is read in a notification, not in the row.
  const notification = coinsNotification(page, `500 pièces ajoutées à Cible ${token}.`);
  await expect(notification).toBeVisible();

  // The player's ledger gets a positive admin_adjust row, the grant keeps the author.
  const grants = await coinGrantsBy(staff.id);
  expect(grants).toHaveLength(1);
  expect(grants[0]).toMatchObject({ user_id: target.id, amount: 500, author_id: staff.id });
  expect(await ledgerOf(target.id, "admin_adjust")).toEqual([
    { amount: 500, type: "admin_adjust", reference_id: grants[0].id, metadata: {} },
  ]);

  // It goes away on its own after 5 s (bounded wait: the time is real, the test stays short).
  await expect(notification).toBeHidden({ timeout: 8000 });
});

/**
 * The success notification of an add: a live region (`role="status"`, always in the page, empty
 * until a message comes) filtered by its text. Never inside the table row.
 */
function coinsNotification(page: Page, text: string) {
  return page.getByRole("status").filter({ hasText: text });
}

const AMOUNT_ERROR = "Le montant doit être un nombre entier supérieur ou égal à 1.";
const REASON_ERROR = "Le motif ne doit pas dépasser 200 caractères.";

/** A super admin signed in on the registry, searched down to the one account `Cible {token}`. */
async function superAdminOnTarget(page: Page, locale = "fr") {
  const token = randomUUID().replaceAll("-", "").slice(0, 10);
  const target = await createPlayer({ display_name: `Cible ${token}` });
  const staff = await createPlayer({ display_name: "Chef E2E" });
  await addTeamMember(staff.id, "super_admin");
  await signIn(page, staff);
  await page.goto(`/${locale}/admin/accounts?q=${token}`);
  const row = page.getByRole("table").locator("tbody tr");
  await expect(row).toHaveCount(1, { timeout: 20_000 });
  return { token, target, staff, row };
}

test("a refused amount shows its message under the field, keeps the dialog open and writes nothing", async ({
  page,
}) => {
  const { token, target, staff, row } = await superAdminOnTarget(page);
  const openButton = row.getByRole("button", { name: `Ajouter des pièces à Cible ${token}` });
  await openButton.click();
  const dialog = page.getByRole("dialog", { name: "Ajouter des pièces" });
  const amount = dialog.getByLabel("Montant");

  await amount.fill("0");
  await dialog.getByRole("button", { name: "Ajouter", exact: true }).click();

  await expect(amount).toHaveAccessibleDescription(AMOUNT_ERROR, { timeout: 20_000 });
  await expect(dialog.getByText(AMOUNT_ERROR)).toBeVisible();
  await expect(amount).toHaveAttribute("aria-invalid", "true");
  await expect(amount).toHaveCSS("border-color", "rgb(180, 35, 24)");
  // What was typed is kept, the dialog stays open.
  await expect(amount).toHaveValue("0");
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: /pièces ajoutées/ })).toHaveCount(0);
  expect(await coinGrantsBy(staff.id)).toEqual([]);
  expect(await ledgerOf(target.id, "admin_adjust")).toEqual([]);

  await test.step("Annuler closes without writing, and the dialog opens clean again", async () => {
    await dialog.getByRole("button", { name: "Annuler" }).click();
    await expect(dialog).toBeHidden();
    expect(await coinGrantsBy(staff.id)).toEqual([]);

    await openButton.click();

    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(AMOUNT_ERROR)).toHaveCount(0);
    await expect(dialog.getByLabel("Montant")).not.toHaveAttribute("aria-invalid", "true");
  });
});

test("a double click on Ajouter adds the coins once", async ({ page }) => {
  const { token, target, staff, row } = await superAdminOnTarget(page);
  await row.getByRole("button", { name: `Ajouter des pièces à Cible ${token}` }).click();
  const dialog = page.getByRole("dialog", { name: "Ajouter des pièces" });
  await dialog.getByLabel("Montant").fill("10");

  // The client guard is what is tested: count the Server Action requests the browser sends, and
  // hold the first one back so a second click can come before the dialog closes.
  let serverActionPosts = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.headers()["next-action"]) serverActionPosts += 1;
  });
  await page.route("**/*", async (route) => {
    const request = route.request();
    if (request.method() === "POST" && request.headers()["next-action"]) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    await route.continue();
  });

  await dialog.getByRole("button", { name: "Ajouter", exact: true }).dblclick();

  await expect(coinsNotification(page, `10 pièces ajoutées à Cible ${token}.`)).toBeVisible({
    timeout: 20_000,
  });
  // A second request would be sent right behind the first: let it settle.
  await page.waitForTimeout(2000);
  expect(serverActionPosts).toBe(1);
  expect(await ledgerOf(target.id, "admin_adjust")).toHaveLength(1);
  expect(await coinGrantsBy(staff.id)).toHaveLength(1);
});

test("in English on a phone, the dialog fits the screen and the labels are translated", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { token, target, staff, row } = await superAdminOnTarget(page, "en");

  await row.getByRole("button", { name: `Add coins to Cible ${token}` }).click();

  const dialog = page.getByRole("dialog", { name: "Add coins" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Amount")).toBeVisible();
  await expect(dialog.getByLabel("Reason (optional)")).toBeVisible();
  const box = await dialog.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  expect(box!.y + box!.height).toBeLessThanOrEqual(844);

  await dialog.getByLabel("Amount").fill("25");
  await dialog.getByRole("button", { name: "Add", exact: true }).click();

  await expect(dialog).toBeHidden({ timeout: 20_000 });
  await expect(coinsNotification(page, `25 coins added to Cible ${token}.`)).toBeVisible();
  const grants = await coinGrantsBy(staff.id);
  expect(grants).toHaveLength(1);
  expect(grants[0]).toMatchObject({ user_id: target.id, amount: 25 });
});

test("adding coins to an account deleted meanwhile is refused in the dialog, which stays open", async ({
  page,
}) => {
  const { token, target, staff, row } = await superAdminOnTarget(page);
  await row.getByRole("button", { name: `Ajouter des pièces à Cible ${token}` }).click();
  const dialog = page.getByRole("dialog", { name: "Ajouter des pièces" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Montant").fill("100");

  // The account goes away between the display and the confirmation.
  const { error } = await deletePlayer(target);
  expect(error).toBeNull();
  await dialog.getByRole("button", { name: "Ajouter", exact: true }).click();

  await expect(dialog.getByText(/Ce compte n.existe plus\./)).toBeVisible({ timeout: 20_000 });
  await expect(dialog).toBeVisible();
  // A refusal is not a success: no notification.
  await expect(page.getByRole("status").filter({ hasText: /pièces ajoutées/ })).toHaveCount(0);
  expect(await coinGrantsBy(staff.id)).toEqual([]);
});

test("a super admin gives a reason, and a reason over 200 characters is refused under its field", async ({
  page,
}) => {
  const { token, target, staff, row } = await superAdminOnTarget(page);
  await row.getByRole("button", { name: `Ajouter des pièces à Cible ${token}` }).click();
  const dialog = page.getByRole("dialog", { name: "Ajouter des pièces" });
  const reason = dialog.getByLabel("Motif (facultatif)");

  await dialog.getByLabel("Montant").fill("1000");
  await reason.fill("a".repeat(201));
  await dialog.getByRole("button", { name: "Ajouter", exact: true }).click();

  await expect(reason).toHaveAccessibleDescription(REASON_ERROR, { timeout: 20_000 });
  await expect(dialog.getByText(REASON_ERROR)).toBeVisible();
  await expect(reason).toHaveAttribute("aria-invalid", "true");
  await expect(reason).toHaveCSS("border-color", "rgb(180, 35, 24)");
  // What was typed is kept (the field is controlled, the form reset does not clear it).
  await expect(reason).toHaveValue("a".repeat(201));
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: /pièces ajoutées/ })).toHaveCount(0);
  expect(await coinGrantsBy(staff.id)).toEqual([]);

  await reason.fill("Gagnant du concours");
  await dialog.getByRole("button", { name: "Ajouter", exact: true }).click();

  await expect(dialog).toBeHidden({ timeout: 20_000 });
  const grants = await coinGrantsBy(staff.id);
  expect(grants).toHaveLength(1);
  expect(grants[0]).toMatchObject({
    user_id: target.id,
    amount: 1000,
    reason: "Gagnant du concours",
  });
});

test("at 1280 px the registry does not scroll sideways and each row's add-coins button is icon-only and fully visible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const { token, row } = await superAdminOnTarget(page);
  const table = page.getByRole("table");
  const name = `Ajouter des pièces à Cible ${token}`;

  // The table's scrolling container: the nearest ancestor that clips or scrolls horizontally.
  const scroller = await table.evaluateHandle((el) => {
    let node: HTMLElement | null = el.parentElement;
    while (node && !["auto", "scroll", "hidden"].includes(getComputedStyle(node).overflowX)) {
      node = node.parentElement;
    }
    return node ?? el.parentElement;
  });
  const { scrollWidth, clientWidth } = await scroller.evaluate((el) => ({
    scrollWidth: (el as HTMLElement).scrollWidth,
    clientWidth: (el as HTMLElement).clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

  const buttons = table.getByRole("button", { name: /^Ajouter des pièces à / });
  const count = await buttons.count();
  expect(count).toBeGreaterThanOrEqual(1);
  const tableBox = (await table.boundingBox())!;
  for (let index = 0; index < count; index += 1) {
    const box = (await buttons.nth(index).boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(tableBox.x);
    expect(box.x + box.width).toBeLessThanOrEqual(tableBox.x + tableBox.width);
    expect(box.y).toBeGreaterThanOrEqual(tableBox.y);
    expect(box.y + box.height).toBeLessThanOrEqual(tableBox.y + tableBox.height);
  }

  // Icon only: no visible text, the label comes in the `title` attribute (tooltip on hover).
  const button = row.getByRole("button", { name });
  await expect(button).toBeVisible();
  await expect(button).toHaveText("");
  await expect(button.getByText("Ajouter des pièces")).toHaveCount(0);
  await expect(button).toHaveAttribute("title", "Ajouter des pièces");
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

// CYR-118: the balance column, the sum of the account's coin ledger at its last calculation.
const BALANCE = 1250;
const balanceTexts = {
  fr: { header: "Solde", written: new Intl.NumberFormat("fr").format(BALANCE) },
  en: { header: "Balance", written: new Intl.NumberFormat("en").format(BALANCE) },
};

// The super admin's column sits before the action column, the viewer's is the last one.
for (const [role, locale] of [
  ["super_admin", "fr"],
  ["viewer", "en"],
] as const) {
  test(`a ${role} reads an account's balance in the registry, written for ${locale}`, async ({
    page,
  }) => {
    const token = randomUUID().replaceAll("-", "").slice(0, 10);
    const target = await createPlayer({ display_name: `Cible ${token}` });
    await giveCoins(target.id, BALANCE);
    const staff = await createPlayer({ display_name: `Equipe ${role}` });
    await addTeamMember(staff.id, role);
    await signIn(page, staff);

    await page.goto(`/${locale}/admin/accounts?q=${token}`);

    const table = page.getByRole("table");
    const row = table.locator("tbody tr");
    await expect(row).toHaveCount(1, { timeout: 20_000 });
    const { header, written } = balanceTexts[locale];
    await expect(table.getByRole("columnheader", { name: header })).toBeVisible();
    // Just before the action column (super admin), else the last column: after the 5 others.
    await expect(row.getByRole("cell").nth(5)).toHaveText(written);
  });
}

test("after a grant of 500, the row shows the old balance plus 500", async ({ page }) => {
  const { token, target, row } = await superAdminOnTarget(page);
  await giveCoins(target.id, BALANCE);
  await page.reload();
  const balanceCell = row.getByRole("cell").nth(5);
  await expect(balanceCell).toHaveText(new Intl.NumberFormat("fr").format(BALANCE), {
    timeout: 20_000,
  });

  await row.getByRole("button", { name: `Ajouter des pièces à Cible ${token}` }).click();
  const dialog = page.getByRole("dialog", { name: "Ajouter des pièces" });
  await dialog.getByLabel("Montant").fill("500");
  await dialog.getByRole("button", { name: "Ajouter", exact: true }).click();

  await expect(dialog).toBeHidden({ timeout: 20_000 });
  await expect(balanceCell).toHaveText(new Intl.NumberFormat("fr").format(BALANCE + 500), {
    timeout: 20_000,
  });
});

test("every coin gradient in the table has its own id", async ({ page }) => {
  const token = randomUUID().replaceAll("-", "").slice(0, 10);
  await createAccountsWithoutSignIn(3, (index) => ({
    display_name: `Dore ${token} ${index + 1}`,
  }));
  const staff = await createPlayer({ display_name: "Chef E2E" });
  await addTeamMember(staff.id, "super_admin");
  await signIn(page, staff);

  await page.goto(`/fr/admin/accounts?q=${token}`);

  await expect(page.getByRole("table").locator("tbody tr")).toHaveCount(3, { timeout: 20_000 });
  const ids = await page
    .getByRole("table")
    .locator("linearGradient")
    .evaluateAll((nodes) => nodes.map((node) => node.id));
  // At least one coin per row (the balance), and the add button's coin.
  expect(ids.length).toBeGreaterThanOrEqual(3);
  for (const id of ids) expect(id).not.toBe("");
  expect(new Set(ids).size).toBe(ids.length);
});
