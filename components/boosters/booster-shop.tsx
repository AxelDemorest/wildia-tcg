"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { BoosterShopSlot } from "@/components/boosters/booster-shop-slot";
import { ShopCountdown } from "@/components/boosters/shop-countdown";
import { TradingCard } from "@/components/cards/trading-card";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { Link, useRouter } from "@/i18n/navigation";
import type { CardRarity, IucnStatus } from "@/lib/cards/types";
import { refusalReloadsOffer } from "@/lib/boosters/open-shop-slot";
import { shopWindowSeconds, type BoosterShopOffer } from "@/lib/boosters/shop";
import { openShopSlot } from "@/server/actions/open-booster";

export type RevealedCard = {
  cardId: string;
  slug: string;
  rarity: CardRarity;
  name: string;
  scientific_name: string | null;
  iucn_status: IucnStatus | null;
  description: string;
  image_path: string | null;
  stats: { power: number; defense: number; speed: number };
};

type Props = {
  locale: string;
  offer: BoosterShopOffer | null;
  /** Seconds left in the offer's window, computed on the server at render. */
  secondsLeft: number;
  isLoggedIn: boolean;
  userId: string | null;
};

export function BoosterShop({ locale, offer, secondsLeft, isLoggedIn, userId }: Props) {
  const t = useTranslations("Boosters");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<RevealedCard[] | null>(null);
  const [revealIndex, setRevealIndex] = useState(0);
  const [openingSlot, setOpeningSlot] = useState<number | null>(null);
  const revealRef = useRef<HTMLHeadingElement>(null);
  const [pending, startTransition] = useTransition();

  const displayCards = useMemo(() => {
    if (!revealed) return [];
    const map = new Map<string, RevealedCard & { quantity: number }>();
    for (const card of revealed) {
      const existing = map.get(card.cardId);
      if (existing) {
        existing.quantity += 1;
      } else {
        map.set(card.cardId, { ...card, quantity: 1 });
      }
    }
    return Array.from(map.values());
  }, [revealed]);

  function handleOpen(slotIndex: number) {
    if (!offer) return;
    setError(null);
    setRevealed(null);
    setRevealIndex(0);

    const formData = new FormData();
    formData.set("locale", locale);
    formData.set("windowIndex", String(offer.windowIndex));
    formData.set("slotIndex", String(slotIndex));

    setOpeningSlot(slotIndex);
    startTransition(async () => {
      const res = await openShopSlot(formData);
      setOpeningSlot(null);
      if (!res.ok) {
        setError(t(`error.${res.error}`));
        if (refusalReloadsOffer(res.error)) router.refresh();
        return;
      }
      setRevealed(res.cards);
      setRevealIndex(0);
    });
  }

  // Brings the reveal into view and into the reading order once it is on screen.
  useEffect(() => {
    if (revealed) revealRef.current?.focus();
  }, [revealed]);

  function showNextCard() {
    if (!revealed) return;
    if (revealIndex < revealed.length - 1) {
      setRevealIndex((i) => i + 1);
    }
  }

  if (!isLoggedIn) {
    return (
      <Surface className="p-6 text-center">
        <p className="text-muted">{t("loginRequired")}</p>
        <Link
          href="/login"
          className="mt-4 inline-flex rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-strong"
        >
          {t("loginCta")}
        </Link>
      </Surface>
    );
  }

  if (!offer || offer.slots.length === 0) {
    return <Surface className="p-8 text-center text-sm text-muted">{t("emptyBoosters")}</Surface>;
  }

  return (
    <div className="space-y-5">
      <ShopCountdown
        secondsAtRender={secondsLeft}
        windowIndex={offer.windowIndex}
        windowSeconds={shopWindowSeconds(offer)}
      />
      {error && (
        <p className="text-sm text-red-300" role="alert">
          {error}
        </p>
      )}
      <ul className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-6">
        {offer.slots.map((slot) => (
          <BoosterShopSlot
            key={slot.slotIndex}
            slot={slot}
            isOpening={openingSlot === slot.slotIndex}
            disabled={pending}
            onOpen={handleOpen}
          />
        ))}
      </ul>

      {revealed && revealed.length > 0 && (
        <section
          className="relative isolate space-y-5 overflow-hidden rounded-lg border border-border bg-surface p-5 sm:p-6"
          aria-live="polite"
        >
          <div
            aria-hidden
            className="absolute left-1/2 top-24 -z-10 size-80 -translate-x-1/2 rounded-full bg-brand/20 blur-3xl"
          />
          <h2
            ref={revealRef}
            tabIndex={-1}
            className="text-lg outline-none font-bold uppercase tracking-tight"
          >
            {t("revealTitle")}
          </h2>
          <div className="mx-auto max-w-xs">
            <TradingCard
              card={{
                id: revealed[revealIndex].cardId,
                slug: revealed[revealIndex].slug,
                scientific_name: revealed[revealIndex].scientific_name,
                iucn_status: revealed[revealIndex].iucn_status,
                rarity: revealed[revealIndex].rarity,
                image_path: revealed[revealIndex].image_path,
                farm_rate_base: 0,
                stats: revealed[revealIndex].stats,
                name: revealed[revealIndex].name,
                description: revealed[revealIndex].description,
              }}
              priorityImage
            />
          </div>
          {revealIndex < revealed.length - 1 ? (
            <Button type="button" variant="secondary" onClick={showNextCard}>
              {t("revealNext", { current: revealIndex + 1, total: revealed.length })}
            </Button>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted">{t("revealDone")}</p>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {displayCards.map((card) => (
                  <li key={card.cardId}>
                    <TradingCard
                      card={{
                        id: card.cardId,
                        slug: card.slug,
                        scientific_name: card.scientific_name,
                        iucn_status: card.iucn_status,
                        rarity: card.rarity,
                        image_path: card.image_path,
                        farm_rate_base: 0,
                        stats: card.stats,
                        name: card.name,
                        description: card.description,
                      }}
                      quantity={card.quantity}
                    />
                  </li>
                ))}
              </ul>
              {userId && (
                <Link
                  href={`/players/${userId}/collection`}
                  className="inline-flex rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-strong"
                >
                  {t("goCollection")}
                </Link>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
