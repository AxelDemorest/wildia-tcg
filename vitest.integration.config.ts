import { defineConfig } from "vitest/config";
import path from "node:path";

// Integration tests run against a local Supabase (`npx supabase start`), never a hosted one:
// tests/integration/supabase.ts refuses any other URL.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.integration.test.ts"],
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
