import { defineConfig, devices } from "@playwright/test";

// End-to-end journeys in a real browser, against the app and the local Supabase
// (npx supabase start). The e2e helpers refuse any non-local Supabase URL.
//
// Locally: reuses the dev server on :3000, or starts `npm run dev`.
// In CI: builds and serves the production app (`next build` + `next start`).
const port = Number(process.env.E2E_PORT ?? 3000);
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "e2e",
  // One journey at a time: they share the server and the local database.
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL,
    locale: "fr-FR",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: process.env.CI
      ? `npm run build && npm run start -- --port ${port}`
      : `npm run dev -- --port ${port}`,
    url: `${baseURL}/fr`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
