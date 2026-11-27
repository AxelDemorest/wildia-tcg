import { expect, test } from "./fixtures";

// A guest opening a page reserved for signed-in players is sent to the login, which brings them
// back to that page (path only, no query string).
for (const path of ["/fr/collection", "/fr/settings/profile"]) {
  test(`a guest opening ${path} lands on the login with that page as returnTo`, async ({
    page,
  }) => {
    await page.goto(path);

    await expect
      .poll(
        () => {
          const url = new URL(page.url());
          return url.pathname + url.search;
        },
        { timeout: 20_000 },
      )
      .toBe(`/fr/login?returnTo=${encodeURIComponent(path)}`);
  });
}
