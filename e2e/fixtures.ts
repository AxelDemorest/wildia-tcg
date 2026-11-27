import { randomInt } from "node:crypto";
import { test as base } from "@playwright/test";

export * from "@playwright/test";

/**
 * The app limits auth attempts to 20 per minute and per client address
 * (server/rate-limit/enforce.ts), read from the first entry of x-forwarded-for. In CI every
 * journey comes from 127.0.0.1, so a run that signs in more than 20 times within a minute
 * gets refused by the limiter, not by the code under test. Each test therefore sends its own
 * random address: Next keeps an x-forwarded-for sent by the client.
 */
export const test = base.extend({
  // `provide` is Playwright's fixture callback (usually named `use`, which ESLint's React hooks
  // rule mistakes for React's `use`).
  extraHTTPHeaders: async ({ extraHTTPHeaders }, provide) => {
    const address = `10.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}`;
    await provide({ ...extraHTTPHeaders, "x-forwarded-for": address });
  },
});
