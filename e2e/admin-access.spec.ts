import { expect, test, type Page } from "@playwright/test";
import { addTeamMember, cleanup, createPlayer, type Player } from "../tests/integration/supabase";

test.afterAll(cleanup);

async function signIn(page: Page, player: Player) {
  await page.goto("/fr/login");
  await page.getByLabel("E-mail").fill(player.email);
  await page.getByLabel("Mot de passe").fill(player.password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  // Longer than the default 5 s: the login redirect is slow when the machine is loaded.
  await expect(page).toHaveURL(/\/fr$/, { timeout: 20_000 });
}

const adminNav = (page: Page) => page.getByRole("navigation", { name: "Espace administration" });
const siteNav = (page: Page) => page.getByRole("navigation", { name: "Navigation principale" });

test("a player without a team role is quietly sent to the site home", async ({ page }) => {
  // A cold `next dev` compiles the routes on first visit.
  test.setTimeout(120_000);

  const player = await createPlayer();
  await signIn(page, player);

  await page.goto("/fr/admin");
  await expect(page).toHaveURL(/\/fr$/, { timeout: 20_000 });
  await expect(siteNav(page)).toBeVisible();
  await expect(adminNav(page)).toHaveCount(0);

  // A plain HTTP redirect, with no admin markup in the response.
  const response = await page.request.get("/fr/admin", { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(new URL(response.headers()["location"], "http://localhost").pathname).toBe("/fr");
  const body = await response.text();
  expect(body).not.toContain("Espace administration");
  // The admin's noindex is for staff only: nothing admin-specific in the redirect body.
  expect(body).not.toMatch(/<meta[^>]+name="robots"/);
});

test("a visitor signs in and comes back to the admin page they asked for", async ({ page }) => {
  test.setTimeout(120_000);

  const member = await createPlayer({ display_name: "Membre E2E" });
  await addTeamMember(member.id, "super_admin");

  await page.goto("/fr/admin");
  await expect(page).toHaveURL(/\/fr\/login\?returnTo=%2Ffr%2Fadmin$/, { timeout: 20_000 });

  await page.getByLabel("E-mail").fill(member.email);
  await page.getByLabel("Mot de passe").fill(member.password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/fr\/admin$/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { level: 1, name: "Accueil" })).toBeVisible();

  // Still signed in: the login sends them straight back to the admin.
  await page.goto("/fr/login?returnTo=%2Ffr%2Fadmin");
  await expect(page).toHaveURL(/\/fr\/admin$/, { timeout: 20_000 });
});

test("a team member gets the light admin shell and its home", async ({ page }) => {
  test.setTimeout(120_000);

  const member = await createPlayer({ display_name: "Membre E2E" });
  await addTeamMember(member.id, "viewer");
  await signIn(page, member);

  await page.goto("/fr/admin");

  await expect(page.getByRole("heading", { level: 1, name: "Accueil" })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText("Vue d’ensemble des comptes joueur de WILDIA TCG.")).toBeVisible();
  await expect(page).toHaveTitle("Accueil · Espace administration");
  await expect(adminNav(page)).toBeVisible();
  await expect(adminNav(page).getByRole("link", { name: "Accueil" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  // Staff pages stay out of search engines.
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  // No player chrome.
  await expect(siteNav(page)).toHaveCount(0);
  // The whole canvas is light, overscroll included.
  const html = page.locator("html");
  await expect(html).toHaveCSS("background-color", "rgb(245, 246, 245)");
  await expect(html).toHaveCSS("color-scheme", "light");

  // Only the current page is marked current.
  await expect(
    adminNav(page).getByRole("link", { name: "Registre des comptes" }),
  ).not.toHaveAttribute("aria-current", "page");

  // Sidebar: registry link, member block, sign-out.
  await expect(adminNav(page).getByRole("link", { name: "Registre des comptes" })).toHaveAttribute(
    "href",
    "/fr/admin/accounts",
  );
  await expect(adminNav(page).getByRole("button", { name: "Se déconnecter" })).toBeVisible();
  const memberName = page.getByText("Membre E2E", { exact: true });
  await expect(memberName).toBeVisible();
  // The nav's member block; the role card of the home shows the same label as a badge.
  await expect(adminNav(page).getByText("Lecteur")).toBeVisible();
  // The home's role card: the viewer's badge and the help text of their role.
  const roleCard = page.locator("section").filter({
    has: page.getByRole("heading", { level: 2, name: "Votre rôle d’équipe", exact: true }),
  });
  const badge = roleCard.getByText("Lecteur", { exact: true });
  await expect(badge).toBeVisible();
  await expect(badge).toHaveCSS("background-color", "rgb(238, 240, 239)");
  await expect(badge).toHaveCSS("color", "rgb(61, 69, 66)");
  await expect(
    roleCard.getByText("Les e-mails des comptes sont masqués pour votre rôle.", { exact: true }),
  ).toBeVisible();
  // A long name is cut on one line with an ellipsis; the full name stays in the tooltip.
  await expect(memberName).toHaveAttribute("title", "Membre E2E");
  await expect(memberName).toHaveCSS("text-overflow", "ellipsis");

  // The registry link leads to its guarded placeholder page, not a 404.
  await adminNav(page).getByRole("link", { name: "Registre des comptes" }).click();
  await expect(page).toHaveURL(/\/fr\/admin\/accounts$/, { timeout: 20_000 });
  await expect(
    page.getByRole("heading", { level: 1, name: "Registre des comptes inscrits" }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(page).toHaveTitle("Registre des comptes inscrits · Espace administration");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await expect(adminNav(page).getByRole("link", { name: "Registre des comptes" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(adminNav(page).getByRole("link", { name: "Accueil" })).not.toHaveAttribute(
    "aria-current",
    "page",
  );

  // Phone: the sidebar gives way to a top bar with tabs and icon controls.
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByText("Membre E2E")).toBeHidden();
  await expect(adminNav(page).getByRole("link", { name: "Registre des comptes" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(adminNav(page).getByRole("link", { name: "Registre des comptes" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Retour au site" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Se déconnecter" })).toBeVisible();

  // Signing out from the top bar really ends the session.
  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await expect(page).toHaveURL(/\/fr\/login$/, { timeout: 20_000 });
  await page.goto("/fr/admin");
  await expect(page).toHaveURL(/\/fr\/login\?returnTo=%2Ffr%2Fadmin$/, { timeout: 20_000 });
});

test("a team member leaves the admin for the site and gets the dark canvas back", async ({
  page,
}) => {
  test.setTimeout(120_000);

  const member = await createPlayer({ display_name: "Membre E2E" });
  await addTeamMember(member.id, "viewer");
  await signIn(page, member);

  await page.goto("/fr/admin");
  await page.getByRole("link", { name: "Retour au site" }).click();
  await expect(page).toHaveURL(/\/fr$/, { timeout: 20_000 });
  await expect(siteNav(page)).toBeVisible();
  await expect(page.locator("html")).toHaveCSS("background-color", "rgb(20, 20, 20)");
});
