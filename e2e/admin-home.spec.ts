import { expect, test, type Locator, type Page } from "./fixtures";
import {
  addTeamMember,
  admin,
  cleanup,
  createPlayer,
  type Player,
} from "../tests/integration/supabase";

// The admin home: three read-only indicators counted on the server, a card linking to the
// registry, and the signed-in member's team role. Counts are compared with the live local DB.
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

async function count(table: "profiles" | "team_members", sinceIso?: string): Promise<number> {
  let query = admin.from(table).select("*", { count: "exact", head: true });
  if (sinceIso) query = query.gte("created_at", sinceIso);
  const { count: total, error } = await query;
  if (error) throw error;
  return total ?? 0;
}

type Counts = { accounts: number; signups: number; teamMembers: number };

async function readCounts(): Promise<Counts> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  return {
    accounts: await count("profiles"),
    signups: await count("profiles", since),
    teamMembers: await count("team_members"),
  };
}

/** The card (a section) whose h2 is exactly this text: "Comptes inscrits" also matches the registry. */
const card = (page: Page, heading: string) =>
  page.locator("section").filter({
    has: page.getByRole("heading", { level: 2, name: heading, exact: true }),
  });

const numberIn = async (kpi: Locator) =>
  Number(((await kpi.locator("p").first().textContent()) ?? "").replace(/\D/g, ""));

test("a viewer sees the three indicators, on one row on desktop and stacked on a phone", async ({
  page,
}) => {
  const viewer = await createPlayer({ display_name: "Lecteur E2E" });
  await addTeamMember(viewer.id, "viewer");
  // A player who signed up 8 days ago: counted in the total, but outside the 7-day window.
  const old = await createPlayer({ display_name: "Ancien E2E" });
  const { error } = await admin
    .from("profiles")
    .update({ created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString() })
    .eq("id", old.id);
  if (error) throw error;
  await signIn(page, viewer);

  await page.setViewportSize({ width: 1280, height: 800 });
  const before = await readCounts();
  await page.goto("/fr/admin");
  const kpis = {
    accounts: card(page, "Comptes inscrits"),
    signups: card(page, "Inscriptions sur 7 jours"),
    teamMembers: card(page, "Membres équipe"),
  };
  await expect(kpis.accounts).toBeVisible({ timeout: 20_000 });
  const after = await readCounts();

  const shown: Counts = {
    accounts: await numberIn(kpis.accounts),
    signups: await numberIn(kpis.signups),
    teamMembers: await numberIn(kpis.teamMembers),
  };
  for (const key of ["accounts", "signups", "teamMembers"] as const) {
    expect(shown[key], key).toBeGreaterThanOrEqual(Math.min(before[key], after[key]));
    expect(shown[key], key).toBeLessThanOrEqual(Math.max(before[key], after[key]));
  }
  // The 8-day-old player is in the total but not in the sign-ups.
  expect(shown.accounts).toBeGreaterThan(shown.signups);

  await expect(kpis.accounts.getByText("Tous les comptes joueur")).toBeVisible();
  await expect(kpis.signups.getByText("Sur les 7 derniers jours glissants")).toBeVisible();
  await expect(kpis.teamMembers.getByText("Tous rôles d’équipe confondus")).toBeVisible();

  // Desktop: the three cards share one row.
  const row = [
    await kpis.accounts.boundingBox(),
    await kpis.signups.boundingBox(),
    await kpis.teamMembers.boundingBox(),
  ];
  expect(row.every((box) => box !== null)).toBe(true);
  const [a, b, c] = row as NonNullable<(typeof row)[number]>[];
  expect(Math.abs(a.y - b.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(b.y - c.y)).toBeLessThanOrEqual(1);
  expect(a.x).toBeLessThan(b.x);
  expect(b.x).toBeLessThan(c.x);

  // Phone: stacked, same left edge and width, no horizontal scroll.
  await page.setViewportSize({ width: 390, height: 844 });
  const stack = [
    await kpis.accounts.boundingBox(),
    await kpis.signups.boundingBox(),
    await kpis.teamMembers.boundingBox(),
  ] as NonNullable<(typeof row)[number]>[];
  expect(stack[0].y).toBeLessThan(stack[1].y);
  expect(stack[1].y).toBeLessThan(stack[2].y);
  expect(stack[1].x).toBeCloseTo(stack[0].x, 0);
  expect(stack[2].x).toBeCloseTo(stack[0].x, 0);
  expect(stack[1].width).toBeCloseTo(stack[0].width, 0);
  expect(stack[2].width).toBeCloseTo(stack[0].width, 0);
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(390);
});

test("a moderator sees the registry card and their own role", async ({ page }) => {
  const member = await createPlayer({ display_name: "Modo E2E" });
  await addTeamMember(member.id, "moderator");
  await signIn(page, member);

  await page.goto("/fr/admin");

  const registry = card(page, "Registre des comptes inscrits");
  await expect(registry).toBeVisible({ timeout: 20_000 });
  await expect(
    registry.getByText(
      "Tous les comptes joueur, du plus récent au plus ancien, par pages de 50. Consultation seule.",
    ),
  ).toBeVisible();
  await expect(
    registry.getByRole("link", { name: "Ouvrir le registre", exact: true }),
  ).toHaveAttribute("href", "/fr/admin/accounts");

  const role = card(page, "Votre rôle d’équipe");
  const badge = role.getByText("Modérateur", { exact: true });
  await expect(badge).toBeVisible();
  await expect(badge).toHaveCSS("background-color", "rgb(232, 238, 249)");
  await expect(badge).toHaveCSS("color", "rgb(31, 78, 140)");
  await expect(
    role.getByText("Vous voyez les e-mails des comptes.", { exact: true }),
  ).toBeVisible();
});

test("a super administrator sees the home in English", async ({ page }) => {
  const member = await createPlayer({ display_name: "Super E2E" });
  await addTeamMember(member.id, "super_admin");
  await signIn(page, member);

  await page.goto("/en/admin");

  for (const heading of ["Registered accounts", "Sign-ups over 7 days", "Team members"]) {
    await expect(card(page, heading)).toBeVisible({ timeout: 20_000 });
  }
  await expect(card(page, "Registered accounts").getByText("All player accounts")).toBeVisible();

  const registry = card(page, "Account registry");
  await expect(registry).toBeVisible();
  await expect(
    registry.getByText("Every player account, newest first, 50 per page. Read only."),
  ).toBeVisible();
  await expect(
    registry.getByRole("link", { name: "Open the registry", exact: true }),
  ).toHaveAttribute("href", "/en/admin/accounts");

  const role = card(page, "Your team role");
  const badge = role.getByText("Super administrator", { exact: true });
  await expect(badge).toBeVisible();
  await expect(badge).toHaveCSS("background-color", "rgb(231, 242, 236)");
  await expect(badge).toHaveCSS("color", "rgb(20, 100, 67)");
  await expect(
    role.getByText("You can see account e-mails. Team roles are managed outside the app for now."),
  ).toBeVisible();
});
