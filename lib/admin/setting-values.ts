import type { TeamRole } from "@/lib/auth/staff-session";

/**
 * The only rôle d’équipe that sees and changes the paramètres du jeu: the Paramètres page and its
 * actions refuse every other one.
 */
export const SETTINGS_ROLE: TeamRole = "super_admin";

/** The paramètres du jeu the Paramètres page edits: economy_config keys. */
export const EDITABLE_SETTINGS = ["farm_global_multiplier", "booster_shop_slot_count"] as const;

export type EditableSetting = (typeof EDITABLE_SETTINGS)[number];

type SettingRule = {
  min: number;
  max: number;
  /** Decimals a value may be written with; 0 is a whole number, written without a point. */
  maxDecimals: number;
};

/** What each setting accepts, checked on the server before any write. */
export const SETTING_RULES: Record<EditableSetting, SettingRule> = {
  farm_global_multiplier: { min: 0, max: 5, maxDecimals: 2 },
  booster_shop_slot_count: { min: 1, max: 12, maxDecimals: 0 },
};

const SETTING_VALUE_ERRORS = ["out_of_range", "too_precise"] as const;

/** Why a value is refused; anything that is not a plain decimal number is out of range. */
export type SettingValueError = (typeof SETTING_VALUE_ERRORS)[number];

export type ParsedSettingValue =
  { ok: true; value: number } | { ok: false; error: SettingValueError };

export function isEditableSetting(value: unknown): value is EditableSetting {
  return EDITABLE_SETTINGS.some((setting) => setting === value);
}

/** Whether an error refuses the value itself, rather than the save or restore failing. */
export function isSettingValueError(error: string): error is SettingValueError {
  return SETTING_VALUE_ERRORS.some((code) => code === error);
}

/**
 * The value a form sent for `setting`, as a number within its bounds. Only digits with an optional
 * decimal part are read: "1.5", not "1,5", "1e0" nor "Infinity".
 */
export function parseSettingValue(setting: EditableSetting, raw: unknown): ParsedSettingValue {
  const { min, max, maxDecimals } = SETTING_RULES[setting];
  const match = typeof raw === "string" ? /^\d+(?:\.(\d+))?$/.exec(raw) : null;
  if (!match) return { ok: false, error: "out_of_range" };

  // A whole-number setting takes no decimal point at all: "8.0" is refused like "8.5".
  const fraction = match[1];
  if (maxDecimals === 0 && fraction !== undefined) return { ok: false, error: "out_of_range" };

  const value = Number(match[0]);
  if (value < min || value > max) return { ok: false, error: "out_of_range" };
  if ((fraction?.length ?? 0) > maxDecimals) return { ok: false, error: "too_precise" };

  return { ok: true, value };
}
