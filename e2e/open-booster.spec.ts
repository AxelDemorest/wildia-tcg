import { randomUUID } from "node:crypto";
import { expect, test, type Locator, type Page } from "./fixtures";
import {
  admin,
  boosterBySlug,
  cleanup,
  createCatalogCard,
  createPlayer,
  drawsOf,
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

const CEREMONY_URL = /\/fr\/boosters\/opening\/[0-9a-f-]{36}$/;

// The pack phase: the pack is a button named after its booster, with one hint per step.
const packButton = (page: Page, booster: "standard" | "premium") =>
  page.getByRole("button", { name: `Ouvrir le Booster ${booster}` });
const restHint = (page: Page) => page.getByText("Maintenez le paquet appuyé", { exact: true });
const chargingHint = (page: Page) => page.getByText("Encore un instant…", { exact: true });
const topCardButton = (page: Page) =>
  page.getByRole("button", { name: /^Retourner la carte 1 sur/ });

// Freezes the page's clock where it stands: the charge and the burst then move only when the test
// advances it with `page.clock.runFor`.
async function pauseClock(page: Page) {
  const now = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(now + 1000);
}

// The face-down cards of the pile, in the page's main area.
const pileBacks = (page: Page) => page.getByRole("main").locator("[data-side=back]");

test("a player opens one emplacement of their shop offer and lands on the face-down stack of the draw", async ({
  page,
}) => {
  // A cold `next dev` compiles /fr/boosters and /fr/collection on first visit.
  test.setTimeout(180_000);

  // The offer is read twice (by the test, then by the page): stay clear of a window change. The
  // journey opens two emplacements of the same window, with a charge and a burst each.
  await waitForShopWindowMargin(75);

  // Runs in real time until a step pauses it on the pack: the charge and the burst are then driven
  // by the test.
  await page.clock.install();

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

  await test.step("open the second emplacement and land on the pack of its draw", async () => {
    // Survives a client update, lost by a full page load.
    await page.evaluate(() => {
      (window as unknown as { __noReload: boolean }).__noReload = true;
    });

    await page.getByRole("button", { name: "Ouvrir Booster standard, emplacement 2" }).click();

    // The ceremony URL carries the draw of the player's only opening. Locally this runs on
    // `next dev`: reaching it without a redirect to the shop also checks the StrictMode double mount.
    // The opening is recorded by the Server Action: wait for its draw before reading the id.
    await expect.poll(async () => (await drawsOf(player.id)).length, { timeout: 20_000 }).toBe(1);
    const [draw] = await drawsOf(player.id);
    await expect(page).toHaveURL(new RegExp(`/fr/boosters/opening/${draw.id}$`), {
      timeout: 20_000,
    });

    // The pack of the draw's type comes first: no card yet, nothing about the species.
    await expect(packButton(page, "standard")).toBeVisible();
    await expect(page.getByRole("main").locator("[data-look]")).toHaveAttribute(
      "data-look",
      "standard",
    );
    await expect(restHint(page)).toBeVisible();
    await expect(topCardButton(page)).toHaveCount(0);

    expect(
      await page.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload),
    ).toBe(true);
  });

  await test.step("release a hold too early, or lose it to a cancelled pointer: the pack calms down", async () => {
    await pauseClock(page);
    const pack = packButton(page, "standard");
    const box = (await pack.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

    await page.mouse.down();
    await expect(chargingHint(page)).toBeVisible();
    await page.clock.runFor(500);
    await page.mouse.up();
    await expect(restHint(page)).toBeVisible();
    await expect(chargingHint(page)).toHaveCount(0);
    await page.clock.runFor(3000);
    await expect(restHint(page)).toBeVisible();
    await expect(topCardButton(page)).toHaveCount(0);

    await pack.dispatchEvent("pointerdown", { button: 0, isPrimary: true, pointerId: 1 });
    await expect(chargingHint(page)).toBeVisible();
    await page.clock.runFor(500);
    await pack.dispatchEvent("pointercancel", { button: 0, isPrimary: true, pointerId: 1 });
    await expect(restHint(page)).toBeVisible();
    await page.clock.runFor(3000);
    await expect(restHint(page)).toBeVisible();
    await expect(topCardButton(page)).toHaveCount(0);
  });

  await test.step("hold the pack: it charges, bursts, then the face-down stack takes over", async () => {
    await page.mouse.down();
    await expect(chargingHint(page)).toBeVisible();

    await page.clock.runFor(1300);
    // Bursting: no hint, no pile yet. Releasing now changes nothing.
    await expect(chargingHint(page)).toHaveCount(0);
    await expect(restHint(page)).toHaveCount(0);
    await expect(topCardButton(page)).toHaveCount(0);
    await page.mouse.up();
    await expect(topCardButton(page)).toHaveCount(0);

    await page.clock.runFor(1500);
    const topCard = page.getByRole("button", {
      name: `Retourner la carte 1 sur ${standard.slots}`,
    });
    await expect(topCard).toBeVisible();
    await expect(topCard.locator("[data-side=back]")).toBeVisible();
    await page.clock.resume();

    // Face down: nothing in the page tells the species or the rarity of the cards.
    const main = page.getByRole("main");
    await expect(main.locator("[data-side=front]")).toHaveCount(0);
    await expect(main.locator("[data-rarity]")).toHaveCount(0);
    for (const name of await drawnCardNames(player)) {
      await expect(main).not.toContainText(name);
    }

    expect(
      await page.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload),
    ).toBe(true);
  });

  await test.step("see the new balance in the header without a reload", async () => {
    await expect(page.getByTitle("850 pièces")).toBeVisible();
  });

  const total = standard.slots;
  const drawnNames = new Set(await drawnCardNames(player));
  const setAsideRow = page.getByRole("list", { name: "Cartes écartées" });

  // The counter and the hint repeat the button's accessible name and are `aria-hidden`: found by text.
  const counter = (position: number) =>
    page.getByText(`Carte ${position} sur ${total}`, { exact: true });
  const turnHint = page.getByText("Cliquez pour retourner", { exact: true });
  const setAsideHint = page.getByText("Cliquez pour écarter", { exact: true });

  await test.step("see the counter and the hint to turn the top card on arrival", async () => {
    await expect(counter(1)).toBeVisible();
    await expect(turnHint).toBeVisible();
    await expect(setAsideHint).toHaveCount(0);
  });

  await test.step("turn and set aside each card in turn", async () => {
    for (let position = 1; position <= total; position++) {
      // A real pile: the face-down cards in it are the cards not yet turned, one fewer each time.
      await expect(pileBacks(page)).toHaveCount(total - position + 1);

      await page
        .getByRole("button", { name: `Retourner la carte ${position} sur ${total}` })
        .click();
      await expect(counter(position)).toBeVisible();
      await expect(setAsideHint).toBeVisible();
      await expect(turnHint).toHaveCount(0);

      // The turned card shows its face; the button now offers to set it aside, by name.
      const setAside = page.getByRole("button", {
        name: new RegExp(`^Écarter .+ \\(${position} sur ${total}\\)$`),
      });
      await expect(setAside.locator("[data-side=front]")).toBeVisible();
      const label = (await setAside.getAttribute("aria-label")) ?? "";
      const name = /^Écarter (.+) \(\d+ sur \d+\)$/.exec(label)?.[1] ?? "";
      expect(drawnNames.has(name), `"${name}" is one of the drawn cards`).toBe(true);

      await setAside.click();

      if (position < total) {
        // The set-aside row holds the cards set aside so far, face up, the last one at its end.
        const aside = setAsideRow.locator("[data-side=front]");
        await expect(aside).toHaveCount(position);
        await expect(aside.last()).toContainText(name);
        await expect(
          page.getByRole("button", { name: `Retourner la carte ${position + 1} sur ${total}` }),
        ).toBeVisible();
        await expect(counter(position + 1)).toBeVisible();
        await expect(turnHint).toBeVisible();
      }
    }
  });

  await test.step("see the grouped recap replace the stack and the row", async () => {
    const heading = page.getByRole("heading", { name: "Récapitulatif de l’ouverture" });
    await expect(heading).toBeVisible();
    await expect(heading).toBeFocused();
    await expect(heading).toBeInViewport();
    await expect(page.getByRole("button", { name: /Retourner la carte/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Écarter / })).toHaveCount(0);
    await expect(setAsideRow).toHaveCount(0);
    await expect(page.getByText(/^Carte \d+ sur \d+$/)).toHaveCount(0);
    await expect(turnHint).toHaveCount(0);
    await expect(setAsideHint).toHaveCount(0);

    // One face per species; "×n" marks a duplicate, no mark means one. They add up to the draw.
    const faces = page.getByRole("main").locator("[data-side=front]");
    await expect(faces).toHaveCount(drawnNames.size);
    let drawn = 0;
    for (const name of drawnNames) {
      const face = faces.filter({ has: page.getByRole("heading", { name, exact: true }) });
      await expect(face).toHaveCount(1);
      // A species drawn once has no mark: count first, `getAttribute` would wait for one.
      const marks = face.locator('[aria-label^="×"]');
      const mark = (await marks.count()) > 0 ? await marks.getAttribute("aria-label") : null;
      drawn += mark ? Number(mark.replace("×", "")) : 1;
    }
    expect(drawn).toBe(total);
  });

  await test.step("go back to the shop with Continuer, a Back and not a new entry", async () => {
    const historyLength = () => page.evaluate(() => window.history.length);
    const before = await historyLength();
    // The restored shop must already show the opened emplacement exhausted: watch for an « Ouvrir »
    // button on it, even for a moment, while the page comes back.
    await page.evaluate(() => {
      const w = window as unknown as { __openSeenAgain?: boolean };
      const name = "Ouvrir Booster standard, emplacement 2";
      new MutationObserver(() => {
        const seen = Array.from(document.querySelectorAll("button")).some(
          (button) => button.getAttribute("aria-label") === name,
        );
        if (seen) w.__openSeenAgain = true;
      }).observe(document, { subtree: true, childList: true, attributes: true });
    });

    await page.getByRole("button", { name: "Continuer" }).click();

    await expect(page).toHaveURL(/\/fr\/boosters$/);
    expect(await historyLength()).toBe(before);
    await expect(emplacements()).toHaveCount(slotCount);
    await expectAccessibleText(emplacements().nth(1), "Épuisé");
    expect(
      await page.evaluate(
        () => (window as unknown as { __openSeenAgain?: boolean }).__openSeenAgain,
      ),
    ).toBeUndefined();
    expect(
      await page.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload),
    ).toBe(true);
  });

  await test.step("find only the notice when going Forward: the ceremony is not replayed", async () => {
    await page.goForward();

    await expect(page).toHaveURL(/\/fr\/boosters(\?.*)?$/);
    await expect(
      page.getByRole("status").filter({ hasText: /Ouverture déjà effectuée/ }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /Retourner la carte/ })).toHaveCount(0);
  });

  await test.step("find every drawn card in the binder", async () => {
    await page.getByRole("link", { name: "Mon classeur" }).first().click();
    // Longer than the default 5 s: the first visit compiles /fr/collection on a cold dev server.
    await expect(page).toHaveURL(/\/fr\/collection/, { timeout: 20_000 });

    for (const name of drawnNames) {
      await expect(page.getByText(name).first()).toBeVisible();
    }
  });

  await test.step("find the emplacement exhausted when coming back in the same window", async () => {
    await page.goto("/fr/boosters");
    await expect(emplacements()).toHaveCount(slotCount);
    await expectAccessibleText(emplacements().nth(1), "Épuisé");
    await expect(openButton(emplacements().nth(1))).toHaveCount(0);
    await expect(pack(emplacements().nth(1))).toHaveAttribute("data-state", "exhausted");
    // The sibling emplacement, not opened, still offers its button.
    await expect(openButton(emplacements().nth(0))).toHaveCount(1);
  });

  await test.step("open the first emplacement, start the charge with Enter and skip it with Échap", async () => {
    await page.getByRole("button", { name: "Ouvrir Booster standard, emplacement 1" }).click();
    await expect(page).toHaveURL(CEREMONY_URL, { timeout: 20_000 });
    await expect(packButton(page, "standard")).toBeVisible();
    await pauseClock(page);

    // A press lost to a cancelled pointer leaves the pack at rest and must not swallow the next
    // activation.
    const pack = packButton(page, "standard");
    await pack.dispatchEvent("pointerdown", { button: 0, isPrimary: true, pointerId: 1 });
    await expect(chargingHint(page)).toBeVisible();
    await page.clock.runFor(500);
    await pack.dispatchEvent("pointercancel", { button: 0, isPrimary: true, pointerId: 1 });
    await expect(restHint(page)).toBeVisible();
    await expect(chargingHint(page)).toHaveCount(0);

    // No hold: Enter alone starts the charge.
    await pack.focus();
    await page.keyboard.press("Enter");
    await expect(chargingHint(page)).toBeVisible();
    await expect(topCardButton(page)).toHaveCount(0);

    await page.keyboard.press("Escape");
    await expect(topCardButton(page)).toBeVisible();
    await expect(topCardButton(page).locator("[data-side=back]")).toBeVisible();
  });
});

async function signIn(page: Page, player: Player) {
  await page.goto("/fr/login");
  await page.getByLabel("E-mail").fill(player.email);
  await page.getByLabel("Mot de passe").fill(player.password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/fr$/, { timeout: 20_000 });
}

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("the keyboard turns and sets aside the cards with no animation, and a reload leaves the ceremony", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await waitForShopWindowMargin(60);

    const player = await createPlayer();
    await giveCoins(player.id, 1000);
    const premium = await boosterBySlug("premium");
    const { data: offer, error } = await player.client.rpc("get_booster_shop_offer");
    if (error) throw error;
    await setShopSlot(player.id, Number(offer.window_index), 0, premium.id);
    await signIn(page, player);
    await page.goto("/fr/boosters");

    await page.getByRole("button", { name: "Ouvrir Booster premium, emplacement 1" }).click();
    await expect(page).toHaveURL(CEREMONY_URL, { timeout: 20_000 });

    const total = premium.slots;
    const turn = (position: number) =>
      page.getByRole("button", { name: `Retourner la carte ${position} sur ${total}` });
    const setAside = (position: number) =>
      page.getByRole("button", {
        name: new RegExp(`^Écarter .+ \\(${position} sur ${total}\\)$`),
      });

    // No transition nor animation with a duration, on anything in the page's main area, but the
    // pile's fade-in (its keyframes name says "fade").
    const expectNoMotion = async () => {
      const motion = await page.getByRole("main").evaluate((main) => {
        const seconds = (list: string) =>
          list.split(",").map((value) => {
            const duration = parseFloat(value);
            return value.trim().endsWith("ms") ? duration / 1000 : duration;
          });
        return [main, ...main.querySelectorAll("*")].flatMap((element) => {
          const style = getComputedStyle(element);
          const names = style.animationName.split(",").map((name) => name.trim());
          const transitions = seconds(style.transitionDuration).filter((value) => value > 0);
          const animations = seconds(style.animationDuration).filter(
            (value, index) => value > 0 && !/fade/i.test(names[index] ?? ""),
          );
          return [...transitions, ...animations].map(
            (duration) => `${element.tagName}.${element.className}: ${duration}s`,
          );
        });
      });
      expect(motion).toEqual([]);
    };

    // The premium pack, in its own look and under its own name, has focus and nothing moves.
    const pack = packButton(page, "premium");
    await expect(pack).toBeVisible();
    await expect(page.getByRole("main").locator("[data-look]")).toHaveAttribute(
      "data-look",
      "premium",
    );
    await expect(pack).toBeFocused();
    await expect(
      page.getByText("Cliquez sur le paquet pour l’ouvrir", { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Passer" })).toHaveCount(0);
    await expectNoMotion();

    // Enter opens it at once: the pile shows and the top card has focus. Enter again turns it.
    await page.keyboard.press("Enter");
    await expect(turn(1)).toBeVisible();
    await expect(turn(1)).toBeFocused();
    await expectNoMotion();
    await page.keyboard.press("Enter");
    await expect(setAside(1).locator("[data-side=front]")).toBeVisible();
    await expect(setAside(1)).toBeFocused();
    await expectNoMotion();

    await page.keyboard.press("Enter");
    await expect(turn(2)).toBeFocused();
    await expectNoMotion();

    await page.keyboard.press("Enter");
    await expect(setAside(2)).toBeFocused();

    // A reload keeps no marker: back to the shop with the notice, no stack.
    await page.reload();
    await expect(page).toHaveURL(/\/fr\/boosters(\?.*)?$/);
    await expect(
      page.getByRole("status").filter({ hasText: /Ouverture déjà effectuée/ }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /Retourner la carte/ })).toHaveCount(0);

    // Opening another emplacement from the shop that carries the notice, then Back: a clean shop.
    expect(new URL(page.url()).searchParams.has("notice")).toBe(true);
    await page
      .getByRole("main")
      .getByRole("button", { name: /^Ouvrir/, disabled: false })
      .first()
      .click();
    await expect(page).toHaveURL(CEREMONY_URL, { timeout: 20_000 });

    // A mouse click on the pack opens it at once: the top card shows, still face down.
    await page.getByRole("button", { name: /^Ouvrir le Booster/ }).click();
    const firstCard = page.getByRole("button", { name: /^Retourner la carte 1 sur/ });
    await expect(firstCard).toBeVisible();
    await expect(firstCard.locator("[data-side=back]")).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/\/fr\/boosters(\?.*)?$/);
    // Wait for the shop to render before asserting an absence.
    await expect(page.getByRole("timer")).toBeVisible();
    expect(new URL(page.url()).searchParams.has("notice")).toBe(false);
    await expect(page.getByRole("status")).toHaveCount(0);
  });
});

test("the ceremony route sends a guest to the login and shows a 404 for an unknown draw", async ({
  page,
}) => {
  const unknownDraw = randomUUID();

  await page.goto(`/fr/boosters/opening/${unknownDraw}`);
  await expect
    .poll(
      () => {
        const url = new URL(page.url());
        return url.pathname + url.search;
      },
      { timeout: 20_000 },
    )
    .toBe(`/fr/login?returnTo=${encodeURIComponent(`/fr/boosters/opening/${unknownDraw}`)}`);

  const player = await createPlayer();
  await signIn(page, player);
  const response = await page.goto(`/fr/boosters/opening/${unknownDraw}`);

  expect(response?.status()).toBe(404);
  await expect(page.getByRole("button", { name: /Retourner la carte/ })).toHaveCount(0);
});
