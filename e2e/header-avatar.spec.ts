import { expect, test, type Locator, type Page } from "./fixtures";
import { admin, cleanup, createPlayer, type Player } from "../tests/integration/supabase";

test.afterAll(cleanup);

const GOOGLE_AVATAR = "https://lh3.googleusercontent.com/a/ACg8ocLe2e=s96-c";
const GOOGLE_AVATAR_IN_SRC = "url=https%3A%2F%2Flh3.googleusercontent.com%2Fa%2FACg8ocLe2e%3Ds96-c";
const DEFAULT_AVATAR_IN_SRC = "url=%2Fmock-avatar.jpg";

/** The browser's request to the image optimizer for an avatar hosted by Google. */
function isGoogleAvatarRequest(url: URL): boolean {
  return (
    url.pathname === "/_next/image" &&
    (url.searchParams.get("url") ?? "").startsWith("https://lh3.googleusercontent.com/")
  );
}

async function signIn(page: Page, player: Player) {
  await page.goto("/fr/login");
  await page.getByLabel("E-mail").fill(player.email);
  await page.getByLabel("Mot de passe").fill(player.password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/fr$/, { timeout: 20_000 });
}

async function setAvatar(player: Player, avatarUrl: string) {
  const { error } = await admin
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", player.id);
  if (error) throw error;
}

/**
 * Waits until the image is fully loaded and decoded to a real picture. With `fromUrl`, the loaded
 * source must be that one: a fallback to the default image right after would fail.
 */
async function expectImageLoaded(image: Locator, fromUrl = "") {
  await expect
    .poll(
      () =>
        image.evaluate(
          (img: HTMLImageElement, expected) =>
            img.complete && img.naturalWidth > 0 && img.currentSrc.includes(expected),
          fromUrl ? encodeURIComponent(fromUrl) : "",
        ),
      { timeout: 15_000 },
    )
    .toBe(true);
}

test("a visitor sees the default image, then a signed-in player sees the Google avatar of their profile", async ({
  page,
}) => {
  await page.route(isGoogleAvatarRequest, (route) =>
    route.fulfill({ status: 200, contentType: "image/jpeg", path: "public/mock-avatar.jpg" }),
  );

  await test.step("the visitor has the default image", async () => {
    await page.goto("/fr");
    const link = page
      .getByRole("link", { name: "Connexion", exact: true })
      .filter({ has: page.locator("img") });
    await expect(link.locator("img")).toHaveAttribute("src", new RegExp(DEFAULT_AVATAR_IN_SRC));
  });

  const player = await createPlayer({ display_name: "Avatar E2E" });
  await setAvatar(player, GOOGLE_AVATAR);

  await test.step("the player sees their avatar in the header", async () => {
    await signIn(page, player);
    const image = page.getByRole("button", { name: "Avatar E2E" }).locator("img");
    await expect(image).toHaveAttribute("src", new RegExp(GOOGLE_AVATAR_IN_SRC));
    await expectImageLoaded(image, GOOGLE_AVATAR);
  });
});

const HTTP_AVATAR = "http://lh3.googleusercontent.com/a/ACg8ocLe2e=s96-c";

test("a profile avatar over http keeps the default image, with no image request for it", async ({
  page,
}) => {
  const player = await createPlayer({ display_name: "Avatar E2E" });
  await setAvatar(player, HTTP_AVATAR);
  const requested: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname === "/_next/image") requested.push(url.searchParams.get("url") ?? "");
  });

  await signIn(page, player);

  const image = page.getByRole("button", { name: "Avatar E2E" }).locator("img");
  await expect(image).toHaveAttribute("src", new RegExp(DEFAULT_AVATAR_IN_SRC));
  await expectImageLoaded(image);
  expect(requested).toContain("/mock-avatar.jpg");
  expect(requested).not.toContain(HTTP_AVATAR);
});

test("an avatar image that fails to load falls back to the default image", async ({ page }) => {
  await page.route(isGoogleAvatarRequest, (route) =>
    route.fulfill({ status: 404, contentType: "text/plain", body: "expired" }),
  );
  const player = await createPlayer({ display_name: "Avatar E2E" });
  await setAvatar(player, GOOGLE_AVATAR);

  await signIn(page, player);

  const image = page.getByRole("button", { name: "Avatar E2E" }).locator("img");
  await expect(image).toHaveAttribute("src", new RegExp(DEFAULT_AVATAR_IN_SRC), {
    timeout: 15_000,
  });
  await expectImageLoaded(image);
});
