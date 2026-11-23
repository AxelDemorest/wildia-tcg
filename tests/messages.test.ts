import { describe, expect, it } from "vitest";
import type { TeamRole } from "@/lib/auth/staff-session";
import type { OpenShopSlotOutcome } from "@/lib/boosters/open-shop-slot";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";

type ErrorCode = Extract<OpenShopSlotOutcome<unknown>, { ok: false }>["error"];

// A code added to the action's outcome fails typecheck here until it is listed.
const errorCodes: Record<ErrorCode, true> = {
  invalid: true,
  unauthenticated: true,
  rate_limited: true,
  insufficient_balance: true,
  slot_not_found: true,
  slot_exhausted: true,
  window_closed: true,
  booster_unavailable: true,
  failed: true,
};

function flatKeys(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    flatKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("Boosters messages", () => {
  it.each(
    Object.keys(errorCodes).flatMap((code) => [
      ["fr", code],
      ["en", code],
    ]),
  )("has a non-empty %s message for the error code %s", (locale, code) => {
    const messages = (locale === "fr" ? fr : en) as unknown as {
      Boosters: { error: Record<string, unknown> };
    };
    const message = messages.Boosters.error[code];
    expect(typeof message === "string" && message.trim().length > 0).toBe(true);
  });

  it("has the same keys in fr and en", () => {
    // The error.* keys are checked code by code above.
    const keys = (messages: unknown) =>
      flatKeys(messages).filter((key) => !key.startsWith("error."));
    expect(keys(en.Boosters).sort()).toEqual(keys(fr.Boosters).sort());
  });
});

describe("Admin messages", () => {
  it("has the same keys in fr and en", () => {
    expect((fr as Record<string, unknown>).Admin).toBeDefined();
    expect((en as Record<string, unknown>).Admin).toBeDefined();
    // The roles.* keys are checked role by role below.
    const keys = (messages: unknown) =>
      flatKeys((messages as Record<string, unknown>).Admin)
        .filter((key) => !key.startsWith("roles."))
        .sort();
    expect(keys(en)).toEqual(keys(fr));
    expect(keys(fr).length).toBeGreaterThan(0);
  });
});

// Contract: Admin.roles.<role> holds the label of each team role, in both files.
// A role added to TeamRole fails typecheck here until it is listed.
const teamRoles: Record<TeamRole, true> = { super_admin: true, moderator: true, viewer: true };

describe("Admin role labels", () => {
  it.each(
    Object.keys(teamRoles).flatMap((role) => [
      ["fr", role],
      ["en", role],
    ]),
  )("has a non-empty %s label for the team role %s", (locale, role) => {
    const messages = (locale === "fr" ? fr : en) as unknown as {
      Admin?: { roles?: Record<string, unknown> };
    };
    const label = messages.Admin?.roles?.[role];
    expect(typeof label === "string" && label.trim().length > 0).toBe(true);
  });
});

// Contract: Admin.home.roleHelp.<role> holds the help text of the role card, in both files.
describe("Admin home role help", () => {
  it.each(
    Object.keys(teamRoles).flatMap((role) => [
      ["fr", role],
      ["en", role],
    ]),
  )("has a non-empty %s help text for the team role %s", (locale, role) => {
    const messages = (locale === "fr" ? fr : en) as unknown as {
      Admin?: { home?: { roleHelp?: Record<string, unknown> } };
    };
    const help = messages.Admin?.home?.roleHelp?.[role];
    expect(typeof help === "string" && help.trim().length > 0).toBe(true);
  });
});
