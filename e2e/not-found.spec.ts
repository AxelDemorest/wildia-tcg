import { randomUUID } from "node:crypto";
import { expect, test } from "./fixtures";

for (const locale of ["fr", "en"]) {
  test(`an invented address in ${locale} shows the 404 page`, async ({ page }) => {
    const response = await page.goto(`/${locale}/${randomUUID()}`);

    expect(response?.status()).toBe(404);
    await expect(page.getByText("This page could not be found.")).toBeVisible();
  });
}
