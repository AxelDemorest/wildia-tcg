import { describe, expect, it } from "vitest";
import type { OAuthErrorCode } from "@/lib/auth/oauth-error";
import type { BoosterField } from "@/lib/admin/booster-values";
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

// A code added to OAUTH_ERRORS fails typecheck here until it is listed.
const oauthErrorCodes: Record<OAuthErrorCode, true> = {
  access_denied: true,
  email_unusable: true,
  account_refused: true,
  failed: true,
};

describe("Auth oauth error messages", () => {
  it.each(
    Object.keys(oauthErrorCodes).flatMap((code) => [
      ["fr", code],
      ["en", code],
    ]),
  )("has a non-empty %s message for the OAuth error code %s", (locale, code) => {
    const messages = (locale === "fr" ? fr : en) as unknown as {
      Auth: { oauthError?: Record<string, unknown> };
    };
    const message = messages.Auth.oauthError?.[code];
    expect(typeof message === "string" && message.trim().length > 0).toBe(true);
  });

  // Decision 2: the messages are neutral, whichever provider the visitor used.
  it.each(
    Object.keys(oauthErrorCodes).flatMap((code) => [
      ["fr", code],
      ["en", code],
    ]),
  )("names no provider in the %s message for the OAuth error code %s", (locale, code) => {
    const messages = (locale === "fr" ? fr : en) as unknown as {
      Auth: { oauthError?: Record<string, unknown> };
    };
    const message = messages.Auth.oauthError?.[code];
    expect(message as string).not.toMatch(/google|discord/i);
  });
});

describe("Auth messages", () => {
  it("has the same keys in fr and en, none empty", () => {
    const auth = (messages: unknown) => (messages as Record<string, unknown>).Auth;
    expect(auth(fr)).toBeDefined();
    expect(auth(en)).toBeDefined();
    // The oauthError.* keys are checked code by code above.
    const keys = (messages: unknown) =>
      flatKeys(auth(messages))
        .filter((key) => !key.startsWith("oauthError."))
        .sort();
    expect(keys(en)).toEqual(keys(fr));
    expect(keys(fr).length).toBeGreaterThan(0);

    const read = (messages: unknown, key: string) =>
      key
        .split(".")
        .reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], auth(messages));
    for (const messages of [fr, en]) {
      const empty = keys(messages).filter((key) => {
        const value = read(messages, key);
        return typeof value !== "string" || value.trim().length === 0;
      });
      expect(empty).toEqual([]);
    }
  });
});

// Contract: Admin.settings.boosters.fields.<field> holds the history label and the restore text
// of each value of a booster, in both files; a rarity's chance is fields.rarity_weights.<rarity>.
// A field added to BoosterField fails typecheck here until listed.
const boosterFields: Record<BoosterField, true> = {
  cost_coins: true,
  slots: true,
  shop_weight: true,
  is_active: true,
  "rarity_weights.common": true,
  "rarity_weights.uncommon": true,
  "rarity_weights.rare": true,
  "rarity_weights.epic": true,
  "rarity_weights.legendary": true,
  "rarity_weights.mythic": true,
};
function messageAt(messages: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (node, key) =>
        typeof node === "object" && node !== null
          ? (node as Record<string, unknown>)[key]
          : undefined,
      messages,
    );
}

describe("Admin booster history labels", () => {
  it.each(
    Object.keys(boosterFields).flatMap((field) =>
      ["historyLabel", "restoreText"].flatMap((kind) => [
        ["fr", field, kind],
        ["en", field, kind],
      ]),
    ),
  )("has a non-empty %s message for the booster field %s: %s", (locale, field, kind) => {
    const messages = locale === "fr" ? fr : en;
    const message = messageAt(messages, `Admin.settings.boosters.fields.${field}.${kind}`);
    expect(typeof message === "string" && message.trim().length > 0).toBe(true);
  });

  it.each(
    ["cost_coins", "slots", "shop_weight", "is_active"].flatMap((field) => [
      ["fr", field],
      ["en", field],
    ]),
  )("has a non-empty %s label for the booster field %s", (locale, field) => {
    const messages = locale === "fr" ? fr : en;
    const message = messageAt(messages, `Admin.settings.boosters.fields.${field}.label`);
    expect(typeof message === "string" && message.trim().length > 0).toBe(true);
  });
});
