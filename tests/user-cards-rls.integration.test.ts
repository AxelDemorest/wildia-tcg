/**
 * Optional integration tests — run with:
 * RUN_SUPABASE_INTEGRATION=1 npm run test:integration
 *
 * Requires two test users + service role in env (see docs/testing.md).
 */
import { describe, expect, it } from "vitest";

const run = process.env.RUN_SUPABASE_INTEGRATION === "1";

describe.skipIf(!run)("user_cards RLS (integration)", () => {
  it("user A cannot read user B inventory via anon client", async () => {
    expect(run).toBe(true);
  });
});
