"use client";

import { redirect } from "next/navigation";
import { useEffect, useReducer, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { TradingCard } from "@/components/cards/trading-card";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import type { RevealedCard } from "@/lib/boosters/enrich-drawn-cards";
import { consumePendingReveal, isRevealPending } from "@/lib/boosters/pending-reveal";
import { ceremonyReducer, createCeremony } from "@/lib/boosters/reveal-ceremony";
import { shopNoticeHref } from "@/lib/boosters/shop-notice";
import type { CatalogCard } from "@/lib/cards/types";

type Props = {
  drawId: string;
  /** In drawn order: the ceremony stacks them in reveal order. */
  cards: RevealedCard[];
};

/** The face de carte of a drawn card; a face shows no farm rate. */
function faceOf({ cardId, ...card }: RevealedCard): CatalogCard {
  return { ...card, id: cardId, farm_rate_base: 0 };
}

/** The révélation of an ouverture the shop has just made in this tab, from its face-down stack. */
export function OpeningCeremony({ drawId, cards }: Props) {
  const t = useTranslations("Boosters");
  const tRarity = useTranslations("Catalog.rarity");
  const locale = useLocale();
  const router = useRouter();
  // Read at the first render only: the marker is consumed after mount, so no later render may read
  // it again (each render after a click, StrictMode's second mount, a router refresh), or the
  // révélation would leave for the shop halfway through.
  const [shopJustOpenedIt] = useState(() => isRevealPending(drawId));
  const [ceremony, dispatch] = useReducer(ceremonyReducer, cards, createCeremony);
  const topCardRef = useRef<HTMLButtonElement>(null);
  const recapHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    consumePendingReveal(drawId);
  }, [drawId]);

  useEffect(() => {
    topCardRef.current?.focus();
  }, []);

  // The heading is only there once the recap replaces the stack: brings it into view and into the
  // reading order.
  useEffect(() => {
    recapHeadingRef.current?.focus();
  }, [ceremony.phase]);

  // A refresh, a direct link, a new tab or a Forward: the cards are in the collection already. On
  // a full load this runs on the server, which redirects before sending the page.
  if (!shopJustOpenedIt) redirect(shopNoticeHref(locale, "already-opened"));

  if (ceremony.phase === "recap") {
    return (
      <section className="space-y-5 py-4">
        <h2
          ref={recapHeadingRef}
          tabIndex={-1}
          className="text-lg font-bold uppercase tracking-tight outline-none"
        >
          {t("recapTitle")}
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {ceremony.recap.map((card) => (
            <li key={card.cardId}>
              <TradingCard card={faceOf(card)} quantity={card.quantity} />
            </li>
          ))}
        </ul>
        <Button onClick={() => router.back()}>{t("continue")}</Button>
      </section>
    );
  }

  const { stack, setAside } = ceremony;
  const [top] = stack;
  const position = setAside.length + 1;
  const total = setAside.length + stack.length;

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <p aria-live="polite" className="sr-only">
        {top.faceUp ? `${top.card.name}, ${tRarity(top.card.rarity)}` : ""}
      </p>
      <button
        ref={topCardRef}
        type="button"
        aria-label={
          top.faceUp
            ? t("setAsideCard", { name: top.card.name, position, total })
            : t("turnCard", { position, total })
        }
        onClick={() => dispatch({ type: "click" })}
        className="block w-full max-w-60 rounded-[6%/4%] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {top.faceUp ? (
          <div className="reveal-turn">
            <TradingCard card={faceOf(top.card)} priorityImage />
          </div>
        ) : (
          <TradingCard side="back" priorityImage />
        )}
      </button>
      {/* The top card's accessible name already says all this. */}
      <div aria-hidden className="space-y-1 text-center">
        <p className="text-sm font-semibold tabular-nums text-foreground">
          {t("cardCounter", { position, total })}
        </p>
        <p className="text-sm text-muted">{top.faceUp ? t("setAsideHint") : t("turnHint")}</p>
      </div>
      {setAside.length > 0 && (
        <ul aria-label={t("setAsideList")} className="flex flex-wrap justify-center gap-2">
          {setAside.map((entry) => (
            <li key={entry.key} className="w-16 sm:w-20">
              <TradingCard card={faceOf(entry.card)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
