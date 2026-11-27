"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { CatalogCard } from "@/lib/cards/types";
import { devGrantCard, type DevGrantState } from "@/server/actions/dev-grant-card";

type Props = {
  locale: string;
  cards: CatalogCard[];
};

const initialState: DevGrantState = { ok: false };

export function DevGrantForm({ locale, cards }: Props) {
  const t = useTranslations("DevGrants");
  const [state, formAction, pending] = useActionState(devGrantCard, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <div>
        <label htmlFor="cardId" className="block text-sm font-medium text-foreground">
          {t("cardLabel")}
        </label>
        <select
          id="cardId"
          name="cardId"
          required
          className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
        >
          <option value="">{t("cardPlaceholder")}</option>
          {cards.map((card) => (
            <option key={card.id} value={card.id}>
              {card.name} ({card.rarity})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="quantity" className="block text-sm font-medium text-foreground">
          {t("quantityLabel")}
        </label>
        <input
          id="quantity"
          name="quantity"
          type="number"
          min={1}
          max={99}
          defaultValue={1}
          className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
        />
      </div>
      {state.message && !state.ok && (
        <p className="text-sm text-red-600" role="alert">{t(`error.${state.message}`)}</p>
      )}
      {state.ok && <p className="text-sm text-brand">{t("success")}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
