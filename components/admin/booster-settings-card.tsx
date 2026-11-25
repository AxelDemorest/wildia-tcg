"use client";

import { useActionState, useId, useState } from "react";
import { AdminCheckIcon } from "@/components/admin/admin-icons";
import { SettingError } from "@/components/admin/setting-error";
import {
  BOOSTER_FIELDS,
  BOOSTER_PRICE,
  BOOSTER_SHOP_WEIGHT,
  BOOSTER_SLOTS,
  RARITY_CHANCE,
  boosterFieldValues,
  byRarity,
  type BoosterCard,
  type BoosterCardErrors,
  type BoosterSettings,
} from "@/lib/admin/booster-values";
import type { BoosterSaveResult } from "@/lib/admin/save-booster";
import { CARD_RARITIES, type CardRarity } from "@/lib/cards/types";
import { saveBooster } from "@/server/actions/admin-settings";

/** What a booster card, or a restore dialog, says when the server refuses a booster's values. */
export type BoosterRefusals = {
  /** A value out of its bounds; `chance` for any rarity's. */
  costCoins: string;
  slots: string;
  shopWeight: string;
  chance: string;
  /** All six chances at 0. */
  noPositiveChance: string;
  /** No booster left that the boutique could offer. */
  noAvailableBooster: string;
};

type Labels = {
  active: string;
  price: string;
  coins: string;
  slots: string;
  shopWeight: string;
  /** The legend of the chances. */
  chances: string;
  rarities: Record<CardRarity, string>;
  save: string;
  saved: string;
  /** Any failure of the save itself, shown in the card. */
  failed: string;
};

type Props = {
  /** The définition's current values, read by the server. */
  booster: BoosterSettings;
  /** The booster's name, the card's title. */
  name: string;
  /**
   * The booster's share of the boutique's emplacements, "70 % des emplacements": the description
   * of its shop weight. Like the chances' shares and total, written by the server from the saved
   * values: they change after "Enregistrer", not while typing.
   */
  slotShare: string;
  /** Each rarity's share of the chances, "55 %": the description of its field. */
  chanceShares: Record<CardRarity, string>;
  /** "Total des chances : 100". */
  chancesTotal: string;
  labels: Labels;
  refusals: BoosterRefusals;
};

/** The values as the form holds them: the server's, until edited. */
function draftOf(booster: BoosterSettings): BoosterCard<string> {
  return {
    costCoins: String(booster.costCoins),
    slots: String(booster.slots),
    shopWeight: String(booster.shopWeight),
    isActive: booster.isActive,
    rarityWeights: byRarity((rarity) => String(booster.rarityWeights[rarity])),
  };
}

type Failure = Extract<BoosterSaveResult, { ok: false }>;

/**
 * Where the card shows a failed save: a refused value under its field; under the chances, a
 * refused chance or six at 0 (refused by the form's check or by the database's); any other failure
 * in the card, above its button.
 */
function failureMessages(
  failure: Failure | null,
  refusals: BoosterRefusals,
  failed: string,
): { fields: BoosterCardErrors; chances: string | null; card: string | null } {
  switch (failure?.error) {
    case undefined:
      return { fields: {}, chances: null, card: null };
    case "invalid_values": {
      const { fields } = failure;
      if (fields.rarityWeights) return { fields, chances: refusals.chance, card: null };
      return { fields, chances: fields.chances ? refusals.noPositiveChance : null, card: null };
    }
    case "no_positive_chance":
      return { fields: {}, chances: refusals.noPositiveChance, card: null };
    case "no_available_booster":
      return { fields: {}, chances: null, card: refusals.noAvailableBooster };
    default:
      return { fields: {}, chances: null, card: failed };
  }
}

type NumberFieldProps = {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  bounds: { min: number; max: number };
  /** The message under the field when its value is refused. */
  error: string | null;
  /** Written after the field, e.g. "pièces". */
  unit?: string;
  /** Under the field, also its description. */
  note?: string;
};

function NumberField({
  id,
  name,
  label,
  value,
  onChange,
  bounds,
  error,
  unit,
  note,
}: NumberFieldProps) {
  const errorId = `${id}-error`;
  const noteId = `${id}-note`;
  const describedBy = [error && errorId, note && noteId].filter(Boolean).join(" ");
  const input = (
    <input
      id={id}
      type="number"
      name={name}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      min={bounds.min}
      max={bounds.max}
      step={1}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy || undefined}
      className={`h-10 w-full min-w-0 rounded-[8px] border bg-white px-3 text-admin-ink tabular-nums ${
        error ? "border-admin-danger" : "border-admin-line-strong"
      }`}
    />
  );

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-semibold text-admin-ink">
        {label}
      </label>
      {unit ? (
        <div className="flex items-center gap-2">
          {input}
          <span className="whitespace-nowrap text-admin-muted">{unit}</span>
        </div>
      ) : (
        input
      )}
      {error && <SettingError id={errorId}>{error}</SettingError>}
      {note && (
        <p id={noteId} className="text-xs/4 text-admin-muted">
          {note}
        </p>
      )}
    </div>
  );
}

/**
 * The card of a booster définition on the Paramètres page, an article named by its title: the
 * "Actif" switch, the price, the cards, the shop weight, the six chances, and one "Enregistrer"
 * for them all (the switch too is saved with it). The browser checks nothing (`noValidate`): the
 * server does, for this form and for a plain POST alike. The fields are controlled so they keep
 * what was typed when React resets the form after the action. Its fields go side by side as the
 * card widens (container queries), so a phone stacks them.
 */
export function BoosterSettingsCard({
  booster,
  name,
  slotShare,
  chanceShares,
  chancesTotal,
  labels,
  refusals,
}: Props) {
  const [result, formAction, pending] = useActionState(saveBooster, null);
  const id = useId();
  const [draft, setDraft] = useState(() => draftOf(booster));
  // The result speaks of the values saved: it is hidden once the card holds others.
  const [resultShown, setResultShown] = useState(false);
  // The server values and the result last rendered, compared during render rather than reset by a
  // remount: focus stays on the field or the button.
  const values = boosterFieldValues(booster);
  const [rendered, setRendered] = useState({ values, result });
  const valuesChanged = BOOSTER_FIELDS.some((field) => rendered.values[field] !== values[field]);
  if (valuesChanged || rendered.result !== result) {
    setRendered({ values, result });
    // After a save or a change made elsewhere (a restore), the card shows the server values again.
    if (valuesChanged) setDraft(draftOf(booster));
    // A save brings its result with the new values; new values alone hide the last result.
    setResultShown(rendered.result !== result);
  }

  const edit = (next: BoosterCard<string>) => {
    setDraft(next);
    setResultShown(false);
  };

  const {
    fields,
    chances: chancesError,
    card: cardError,
  } = failureMessages(resultShown && result?.ok === false ? result : null, refusals, labels.failed);

  const titleId = `${id}-title`;
  const activeId = `${id}-active`;
  const chancesErrorId = `${id}-chances-error`;

  return (
    <article
      aria-labelledby={titleId}
      className="@container flex flex-[1_1_480px] flex-col rounded-xl border border-admin-line bg-white p-6"
    >
      <form action={formAction} noValidate className="flex flex-1 flex-col gap-5">
        <input type="hidden" name="slug" value={booster.slug} />
        <div className="flex items-center justify-between gap-3">
          <h3 id={titleId} className="text-lg/6 font-semibold text-admin-ink">
            {name}
          </h3>
          <div className="flex items-center gap-2.5">
            <span id={activeId} className="font-medium text-admin-text">
              {labels.active}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={draft.isActive}
              aria-labelledby={activeId}
              onClick={() => edit({ ...draft, isActive: !draft.isActive })}
              className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full ${
                draft.isActive ? "bg-brand" : "bg-admin-disabled"
              }`}
            >
              <span
                aria-hidden="true"
                className={`absolute top-[3px] size-[18px] rounded-full bg-white shadow-[0_1px_2px_rgb(0_0_0/0.2)] ${
                  draft.isActive ? "left-[23px]" : "left-[3px]"
                }`}
              />
            </button>
            {/* Sent when on, like a checked checkbox. */}
            {draft.isActive && <input type="hidden" name="isActive" value="on" />}
          </div>
        </div>

        <div className="grid gap-4 @sm:grid-cols-3">
          <NumberField
            id={`${id}-price`}
            name="costCoins"
            label={labels.price}
            value={draft.costCoins}
            onChange={(costCoins) => edit({ ...draft, costCoins })}
            bounds={BOOSTER_PRICE}
            error={fields.costCoins ? refusals.costCoins : null}
            unit={labels.coins}
          />
          <NumberField
            id={`${id}-slots`}
            name="slots"
            label={labels.slots}
            value={draft.slots}
            onChange={(slots) => edit({ ...draft, slots })}
            bounds={BOOSTER_SLOTS}
            error={fields.slots ? refusals.slots : null}
          />
          <NumberField
            id={`${id}-weight`}
            name="shopWeight"
            label={labels.shopWeight}
            value={draft.shopWeight}
            onChange={(shopWeight) => edit({ ...draft, shopWeight })}
            bounds={BOOSTER_SHOP_WEIGHT}
            error={fields.shopWeight ? refusals.shopWeight : null}
            note={slotShare}
          />
        </div>

        <fieldset className="flex flex-col gap-2.5">
          <legend className="mb-2.5 font-semibold text-admin-ink">{labels.chances}</legend>
          <div className="grid gap-x-6 gap-y-2.5 @md:grid-cols-2">
            {CARD_RARITIES.map((rarity) => {
              const inputId = `${id}-${rarity}`;
              const shareId = `${inputId}-share`;
              const invalid = fields.rarityWeights?.[rarity] !== undefined;
              return (
                <div key={rarity} className="flex items-center gap-3">
                  <label htmlFor={inputId} className="min-w-0 flex-1 text-admin-text">
                    {labels.rarities[rarity]}
                  </label>
                  <input
                    id={inputId}
                    type="number"
                    name={`rarityWeights.${rarity}`}
                    value={draft.rarityWeights[rarity]}
                    onChange={(event) =>
                      edit({
                        ...draft,
                        rarityWeights: { ...draft.rarityWeights, [rarity]: event.target.value },
                      })
                    }
                    min={RARITY_CHANCE.min}
                    max={RARITY_CHANCE.max}
                    step={1}
                    aria-invalid={invalid ? true : undefined}
                    aria-describedby={invalid ? `${chancesErrorId} ${shareId}` : shareId}
                    className={`h-9 w-[72px] shrink-0 rounded-[8px] border bg-white px-3 text-admin-ink tabular-nums ${
                      invalid ? "border-admin-danger" : "border-admin-line-strong"
                    }`}
                  />
                  <span
                    id={shareId}
                    className="w-12 shrink-0 text-right text-xs/4 whitespace-nowrap text-admin-muted tabular-nums"
                  >
                    {chanceShares[rarity]}
                  </span>
                </div>
              );
            })}
          </div>
          {chancesError && <SettingError id={chancesErrorId}>{chancesError}</SettingError>}
        </fieldset>

        {cardError && <SettingError>{cardError}</SettingError>}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-admin-neutral-soft pt-4">
          <p className="text-[13px]/[18px] text-admin-muted tabular-nums">{chancesTotal}</p>
          <div className="flex items-center gap-3">
            {/* Always in the page, so screen readers announce "Enregistré" when it appears. */}
            <p
              role="status"
              className="flex items-center gap-1.5 text-[13px]/[18px] font-medium text-brand-strong"
            >
              {resultShown && result?.ok && (
                <>
                  <AdminCheckIcon className="size-4" />
                  {labels.saved}
                </>
              )}
            </p>
            <button
              type="submit"
              disabled={pending}
              className="h-10 cursor-pointer rounded-[8px] bg-brand px-4 font-semibold text-white disabled:cursor-default"
            >
              {labels.save}
            </button>
          </div>
        </div>
      </form>
    </article>
  );
}
