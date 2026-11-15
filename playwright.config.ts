import { defineConfig, devices } from "@playwright/test";

// End-to-end journeys in a real browser, against `npm run dev` and the local Supabase
// (npx supabase start). The e2e helpers refuse any non-local Supabase URL.
export default defineConfig({
  testDir: "e2e",
  // One journey at a time: they share the dev server and the local database.
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3000",
    locale: "fr-FR",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/fr",
    // Reuse the dev server already running locally; CI starts its own.
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
