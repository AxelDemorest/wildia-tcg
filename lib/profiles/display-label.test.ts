import { describe, expect, it } from "vitest";
import { displayLabel } from "@/lib/profiles/display-label";

// The contract under test (moved out of components/layout/header-profile.tsx):
//   // lib/profiles/display-label.ts
//   displayLabel(displayName: string | null | undefined, email: string | null | undefined, fallback: string): string

describe("displayLabel", () => {
  it.each([
    ["  Membre E2E  ", "a@example.test", "Membre E2E"],
    ["   ", "kiwi@example.test", "kiwi"],
    [null, "kiwi@example.test", "kiwi"],
    [null, null, "Membre équipe"],
    ["", "not-an-email", "Membre équipe"],
  ])("with name %j and e-mail %j gives %j", (name, email, expected) => {
    expect(displayLabel(name, email, "Membre équipe")).toBe(expected);
  });
});
