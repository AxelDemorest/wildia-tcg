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
    // One file at a time: a booster opened in one file must not draw a card that another
    // file is about to delete.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
