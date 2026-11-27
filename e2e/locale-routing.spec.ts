import { expect, test } from "@playwright/test";

test.describe("language in the address", () => {
  test("the home page without a language goes to French", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveURL(/\/fr$/);
  });

  test("a page without a language keeps its path, in French", async ({ page }) => {
    await page.goto("/cards");

    await expect(page).toHaveURL(/\/fr\/cards$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test.describe("for a browser set to English", () => {
    test.use({ locale: "en-US" });

    test("the home page goes to English", async ({ page }) => {
      await page.goto("/");

      await expect(page).toHaveURL(/\/en$/);
    });
  });

  test("an explicit language is kept whatever the browser says", async ({ page }) => {
    await page.goto("/en/cards");

    await expect(page).toHaveURL(/\/en\/cards$/);
  });
});
