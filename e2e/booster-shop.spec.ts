import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import {
  admin,
  boosterBySlug,
  cleanup,
  createCatalogCard,
  createPlayer,
  giveCoins,
  moveShopOffer,
  setShopSlot,
  setShopSlotCount,
  shopWindowEndMs,
  waitForShopWindowMargin,
  type Player,
} from "../tests/integration/supabase";

// The shop page of a signed-in player: timer, refusals, double click, empty offer, guest.
// Uses the real "standard" booster; the test adds one displayable card so the catalogue is never
// empty (on an empty database every slot falls back to it).
test.beforeAll(async () => {
  await createCatalogCard("common", `Carte E2E ${randomUUID().slice(0, 8)}`);
});

test.afterAll(cleanup);

// A cold `next dev` compiles the pages on first visit; a window change would split a test.
test.beforeEach(async () => {
  test.setTimeout(180_000);
  await waitForShopWindowMargin(60);
});

async function signIn(page: Page, player: Player) {
  await page.goto("/fr/login");
  await page.getByLabel("E-mail").fill(player.email);
  await page.getByLabel("Mot de passe").fill(player.password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  // Longer than the default 5 s: the login redirect is slow when the machine is loaded.
  await expect(page).toHaveURL(/\/fr$/, { timeout: 20_000 });
}

/** Reads the player's offer (which stores it) and forces slot 0 onto the standard booster. */
async function forceSlotZeroToStandard(player: Player): Promise<number> {
  const standard = await boosterBySlug("standard");
  const { data, error } = await player.client.rpc("get_booster_shop_offer");
  if (error) throw error;
  const windowIndex = Number(data.window_index);
  await setShopSlot(player.id, windowIndex, 0, standard.id);
  return windowIndex;
}

/** Reads the player's offer and forces slots 0 and 1 onto the standard booster. */
async function forceSlotsZeroAndOneToStandard(player: Player): Promise<void> {
  const standard = await boosterBySlug("standard");
  const { data, error } = await player.client.rpc("get_booster_shop_offer");
  if (error) throw error;
  for (const slotIndex of [0, 1]) {
    await setShopSlot(player.id, Number(data.window_index), slotIndex, standard.id);
  }
}

// The grid is the list of the page's main area, one item per emplacement, in slotIndex order.
const emplacements = (page: Page) =>
  page
    .getByRole("main")
    .getByRole("list")
    // The explainer tiles above the shop are lists too, with a decorative pack.
    .filter({ has: page.locator("[data-state]:not(.shop-explainer-pack *)") })
    .first()
    .getByRole("listitem");
const openButton = (item: ReturnType<typeof emplacements>) =>
  item.getByRole("button", { name: /Ouvrir/, disabled: false });

// Next.js keeps an empty role="alert" route announcer in every page: only the one with text counts.
const alertOf = (page: Page) => page.getByRole("alert").filter({ hasText: /\S/ });

function timerSeconds(text: string): number {
  const match = /(\d+):(\d{2})/.exec(text);
  if (!match) throw new Error(`Timer sans format m:ss : "${text}"`);
  return Number(match[1]) * 60 + Number(match[2]);
}

// The page counts down from the seconds the server computed at render, starting when the page
// hydrates, so the timer reads high by the load delay (about 1 s on a good connection, 2.7 s
// measured on a warm local dev server). Product decision: that delay is accepted. Hence a wider
// margin above the database's remaining time than below it.
const TIMER_MAX_BELOW_SECONDS = 3;
const TIMER_MAX_ABOVE_SECONDS = 6;

/** Checks a timer reading against the database's window end (a timestamp on this clock). */
function expectTimerNearWindowEnd(shownSeconds: number, readAtMs: number, windowEndMs: number) {
  const dbRemaining = (windowEndMs - readAtMs) / 1000;
  expect(shownSeconds).toBeGreaterThanOrEqual(dbRemaining - TIMER_MAX_BELOW_SECONDS);
  expect(shownSeconds).toBeLessThanOrEqual(dbRemaining + TIMER_MAX_ABOVE_SECONDS);
}

test("the timer counts down to the end of the window, as the database sees it", async ({
  page,
}) => {
  const player = await createPlayer();
  await signIn(page, player);
  await page.goto("/fr/boosters");

  const timer = page.getByRole("timer");
  await expect(timer).toBeVisible();

  const first = timerSeconds((await timer.textContent()) ?? "");
  const firstReadAtMs = Date.now();
  expectTimerNearWindowEnd(first, firstReadAtMs, shopWindowEndMs());

  await page.waitForTimeout(2200);
  const later = timerSeconds((await timer.textContent()) ?? "");
  expect(later).toBeLessThan(first);
});

test("coming back with the browser's Back button reloads the offer: the timer is fresh", async ({
  page,
}) => {
  const player = await createPlayer();
  await signIn(page, player);
  await page.goto("/fr/boosters");
  await expect(page.getByRole("timer")).toBeVisible();

  // Client-side navigation away from the page, then wait: the window keeps running.
  await page.getByRole("link", { name: "Ma collection" }).first().click();
  await expect(page).toHaveURL(new RegExp(`/fr/players/${player.id}/collection`));
  await page.waitForTimeout(20_000);

  await page.goBack();
  await expect(page).toHaveURL(/\/fr\/boosters/);
  const timer = page.getByRole("timer");
  await expect(timer).toBeVisible();

  // The restored page may paint the cached offer first: the reload must replace it within seconds.
  const deltaFromDatabase = async () => {
    const shown = timerSeconds((await timer.textContent()) ?? "");
    return shown - (shopWindowEndMs() - Date.now()) / 1000;
  };
  await expect
    .poll(deltaFromDatabase, { timeout: 10_000 })
    .toBeGreaterThanOrEqual(-TIMER_MAX_BELOW_SECONDS);
  await expect
    .poll(deltaFromDatabase, { timeout: 10_000 })
    .toBeLessThanOrEqual(TIMER_MAX_ABOVE_SECONDS);
});

test("at the end of the window the page reloads the offer and the timer restarts from the server", async ({
  page,
}) => {
  // The browser clock only is moved: the database still answers the same window, with time left.
  await page.clock.install({ time: new Date() });
  const player = await createPlayer();
  await signIn(page, player);
  await page.goto("/fr/boosters");

  const timer = page.getByRole("timer");
  await expect(timer).toBeVisible();
  const first = timerSeconds((await timer.textContent()) ?? "");
  await page.evaluate(() => {
    (window as unknown as { __noReload: boolean }).__noReload = true;
  });

  // Past the end of the countdown: it reaches 0:00, reloads the offer, and restarts.
  await page.clock.fastForward((first + 5) * 1000);

  await expect
    .poll(async () => timerSeconds((await timer.textContent()) ?? ""), { timeout: 15_000 })
    .toBeGreaterThan(30);
  const restarted = timerSeconds((await timer.textContent()) ?? "");
  const restartedReadAtMs = Date.now();
  expectTimerNearWindowEnd(restarted, restartedReadAtMs, shopWindowEndMs());
  expect(
    await page.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload),
  ).toBe(true);
});

test("when the server keeps answering the same window with no time left, the page does not refresh in a loop", async ({
  page,
}) => {
  // Server clock ahead of the database's: each refresh brings the same window with a little less
  // than 0 s left, a different value every time, so the countdown restarts on each new answer.
  await page.clock.install({ time: new Date() });
  const player = await createPlayer();
  await signIn(page, player);
  await page.goto("/fr/boosters");

  const timer = page.getByRole("timer");
  await expect(timer).toBeVisible();
  const first = timerSeconds((await timer.textContent()) ?? "");

  let refreshes = 0;
  await page.route("**/boosters?_rsc=*", async (route) => {
    const request = route.request();
    const isRefresh =
      Boolean(request.headers()["rsc"]) && !request.headers()["next-router-prefetch"];
    if (!isRefresh) return route.continue();
    refreshes += 1;
    const response = await route.fetch();
    const body = (await response.text()).replace(
      /"secondsLeft":-?[\d.e-]+/,
      `"secondsLeft":${-0.001 * refreshes}`,
    );
    return route.fulfill({ response, body });
  });

  await page.clock.fastForward((first + 5) * 1000);
  await expect(timer).toHaveText("0:00", { timeout: 15_000 });

  // Real time flows on: one retry every RELOAD_RETRY_MS (2 s) at most, so 3 more in 6 s.
  try {
    await page.waitForTimeout(6000);
    expect(refreshes).toBeLessThanOrEqual(5);
    await expect(timer).toHaveText("0:00");
  } finally {
    // Waits for a refresh still in flight, so the handler cannot fail after the test has ended.
    await page.unrouteAll({ behavior: "ignoreErrors" });
  }
});

test("a first visit to the page does not refresh the offer", async ({ page }) => {
  const player = await createPlayer();
  await signIn(page, player);

  // An offer refresh is an RSC request for the page that is not a prefetch.
  let refreshes = 0;
  page.on("request", (request) => {
    const headers = request.headers();
    if (
      request.url().includes("/fr/boosters?_rsc=") &&
      headers["rsc"] &&
      !headers["next-router-prefetch"]
    ) {
      refreshes += 1;
    }
  });

  await page.goto("/fr/boosters");
  await expect(page.getByRole("timer")).toBeVisible();

  // The window has more than 60 s left: the countdown's own reload cannot be part of this.
  await page.waitForTimeout(3000);
  expect(refreshes).toBe(0);
});

// The grid has 6 packs per row on desktop, 3 from the sm breakpoint, 2 on a phone. Default config holds 8 emplacements.
const topOf = async (item: ReturnType<typeof emplacements>) => {
  const box = await item.boundingBox();
  if (!box) throw new Error("emplacement without a bounding box");
  return box.y;
};
const SAME_ROW_TOLERANCE_PX = 4;

for (const layout of [
  { name: "desktop", size: { width: 1280, height: 720 }, perRow: 6 },
  { name: "phone", size: { width: 390, height: 844 }, perRow: 2 },
  { name: "narrow tablet", size: { width: 700, height: 900 }, perRow: 3 },
]) {
  test(`the 8 emplacements are laid out ${layout.perRow} per row (${layout.name})`, async ({
    page,
  }) => {
    const player = await createPlayer();
    await signIn(page, player);
    await page.setViewportSize(layout.size);
    await page.goto("/fr/boosters");

    const items = emplacements(page);
    await expect(items).toHaveCount(8);
    await expect(page.getByRole("timer")).toBeVisible();

    const firstTop = await topOf(items.nth(0));
    for (let index = 1; index < layout.perRow; index++) {
      expect(Math.abs((await topOf(items.nth(index))) - firstTop)).toBeLessThanOrEqual(
        SAME_ROW_TOLERANCE_PX,
      );
    }
    // The next emplacement starts a new row, below.
    expect(await topOf(items.nth(layout.perRow))).toBeGreaterThan(firstTop + SAME_ROW_TOLERANCE_PX);
  });
}

test("a guest sees the login message and link, and cannot open anything", async ({ page }) => {
  await page.goto("/fr/boosters");

  await expect(page.getByText("Connectez-vous pour ouvrir un booster.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Se connecter" })).toHaveAttribute(
    "href",
    "/fr/login",
  );
  await expect(page.getByRole("button", { name: /Ouvrir/ })).toHaveCount(0);
});

for (const viewport of [
  { name: "desktop", size: null },
  { name: "phone", size: { width: 390, height: 844 } },
]) {
  test(`a refused opening shows its message, in view, and leaves the emplacement available (${viewport.name})`, async ({
    page,
  }) => {
    const player = await createPlayer();
    await giveCoins(player.id, 100);
    await forceSlotZeroToStandard(player);
    await signIn(page, player);
    if (viewport.size) await page.setViewportSize(viewport.size);
    await page.goto("/fr/boosters");

    await openButton(emplacements(page).nth(0)).click();

    await expect(alertOf(page)).toHaveText("Solde insuffisant. Farmez ou attendez un peu.");
    // Rendered above the grid, next to the timer: no scrolling needed to read it.
    await expect(alertOf(page)).toBeInViewport();
    await expect(openButton(emplacements(page).nth(0))).toHaveCount(1);
    await expect(emplacements(page).nth(0)).not.toContainText("Épuisé");
  });
}

test("while an opening is pending, only the clicked emplacement shows it", async ({ page }) => {
  const player = await createPlayer();
  await giveCoins(player.id, 1000);
  await forceSlotsZeroAndOneToStandard(player);
  await signIn(page, player);
  await page.goto("/fr/boosters");

  // Holds the Server Action response until the assertions are done.
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/boosters", async (route) => {
    if (route.request().method() === "POST" && route.request().headers()["next-action"]) {
      await gate;
    }
    await route.continue();
  });

  try {
    await page.getByRole("button", { name: "Ouvrir Booster standard, emplacement 2" }).click();

    // The clicked one says so; the other keeps its name, and is disabled meanwhile.
    await expect(emplacements(page).nth(1).getByRole("button")).toHaveText("Ouverture…");
    const other = page.getByRole("button", { name: "Ouvrir Booster standard, emplacement 1" });
    await expect(other).toBeDisabled();
    await expect(page.getByRole("button", { name: "Ouverture…" })).toHaveCount(1);

    // Only the clicked pack is opening; the other available ones stay idle.
    const state = (index: number) => emplacements(page).nth(index).locator("[data-state]");
    await expect(state(1)).toHaveAttribute("data-state", "opening");
    await expect(state(0)).toHaveAttribute("data-state", "idle");
    const count = await emplacements(page).count();
    for (let index = 2; index < count; index++) {
      await expect(state(index)).toHaveAttribute("data-state", "idle");
    }
  } finally {
    release();
  }

  await expect(page.getByRole("heading", { name: "Vos tirages" })).toBeVisible();
});

test("a double click on an emplacement opens it once", async ({ page }) => {
  const player = await createPlayer();
  await giveCoins(player.id, 1000);
  await forceSlotZeroToStandard(player);
  await signIn(page, player);
  await page.goto("/fr/boosters");

  // The client guard is what is tested: count the Server Action requests the browser sends.
  let serverActionPosts = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.headers()["next-action"]) serverActionPosts += 1;
  });

  await openButton(emplacements(page).nth(0)).dblclick();

  await expect(page.getByText("Vos tirages")).toBeVisible();
  // A second request would be sent right behind the first: let it settle.
  await page.waitForTimeout(2000);
  expect(serverActionPosts).toBe(1);
  await expect(alertOf(page)).toHaveCount(0);
});

test("an emplacement opened elsewhere shows the refusal, then turns exhausted", async ({
  page,
}) => {
  const player = await createPlayer();
  await giveCoins(player.id, 1000);
  const windowIndex = await forceSlotZeroToStandard(player);
  await signIn(page, player);
  await page.goto("/fr/boosters");
  await expect(openButton(emplacements(page).nth(0))).toHaveCount(1);

  // Another tab opens the same emplacement while this page still shows it available.
  const { error } = await player.client.rpc("open_booster_shop_slot", {
    p_window_index: windowIndex,
    p_slot_index: 0,
  });
  if (error) throw error;

  await openButton(emplacements(page).nth(0)).click();

  await expect(alertOf(page)).toContainText(/déjà ouvert/);
  // The accessibility tree, not `textContent`: the pack's `aria-hidden` stamp also reads "Épuisé".
  await expect.poll(() => emplacements(page).nth(0).ariaSnapshot()).toContain("Épuisé");
  await expect(openButton(emplacements(page).nth(0))).toHaveCount(0);
});

test("a new window brings a new offer, with no emplacement exhausted", async ({ page }) => {
  const player = await createPlayer();
  await giveCoins(player.id, 1000);
  const windowIndex = await forceSlotZeroToStandard(player);
  await signIn(page, player);

  // The current offre has an exhausted emplacement.
  const opened = await player.client.rpc("open_booster_shop_slot", {
    p_window_index: windowIndex,
    p_slot_index: 0,
  });
  if (opened.error) throw opened.error;

  // Simulated window change: the stored offre now belongs to the previous window.
  await moveShopOffer(player.id, windowIndex - 1);
  await page.goto("/fr/boosters");

  // A new offre: every emplacement shows its "Ouvrir" button.
  const items = emplacements(page);
  await expect(items).toHaveCount(8);
  for (let index = 0; index < 8; index++) {
    await expect(openButton(items.nth(index))).toHaveCount(1);
  }
});

test("a shop with no emplacement shows the empty message", async ({ page }) => {
  const { data, error } = await admin
    .from("economy_config")
    .select("value")
    .eq("key", "booster_shop_slot_count")
    .single();
  if (error) throw error;
  const original = Number(data.value);

  // Global config: the single Playwright worker keeps other journeys from reading it meanwhile.
  try {
    await setShopSlotCount(0);
    const player = await createPlayer();
    await signIn(page, player);
    await page.goto("/fr/boosters");

    await expect(page.getByText("Aucun booster disponible pour le moment.")).toBeVisible();
  } finally {
    await setShopSlotCount(original);
  }
});
