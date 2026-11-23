import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const adminDir = path.join(__dirname, "..", "app", "[locale]", "(admin)");

function pagesUnder(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return pagesUnder(full);
    return entry.name === "page.tsx" ? [full] : [];
  });
}

// A layout does not re-render on navigation and does not stop a page from rendering: each admin
// page checks the session itself.
describe("admin pages", () => {
  it("has at least one admin page", () => {
    expect(pagesUnder(adminDir).length).toBeGreaterThan(0);
  });

  it("calls requireStaff in every admin page", () => {
    const unguarded = pagesUnder(adminDir)
      .filter((file) => !readFileSync(file, "utf8").includes("requireStaff("))
      .map((file) => path.relative(adminDir, file));
    expect(unguarded).toEqual([]);
  });
});
