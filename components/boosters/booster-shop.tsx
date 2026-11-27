"use client";

import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { BoosterPack } from "@/components/boosters/booster-pack";
import { ShopCountdown } from "@/components/boosters/shop-countdown";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { Link, useRouter } from "@/i18n/navigation";
import { refusalReloadsOffer } from "@/lib/boosters/open-shop-slot";
import { markPendingReveal } from "@/lib/boosters/pending-reveal";
import type { BoosterShopOffer } from "@/lib/boosters/shop";
import { parseShopNotice } from "@/lib/boosters/shop-notice";
import { openShopSlot } from "@/server/actions/open-booster";

type Props = {
  locale: string;
  offer: BoosterShopOffer | null;
  /** Seconds left in the offer's window, computed on the server at render. */
  secondsLeft: number;
  isLoggedIn: boolean;
};

export function BoosterShop({ locale, offer, secondsLeft, isLoggedIn }: Props) {
  const t = useTranslations("Boosters");
  const router = useRouter();
  // Why the shop shows in place of a révélation, if it does: the URL alone says so, Back included.
  const notice = parseShopNotice(useSearchParams().get("notice"));
  const [error, setError] = useState<string | null>(null);
  const [openingSlot, setOpeningSlot] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  function handleOpen(slotIndex: number) {
    if (!offer) return;
    setError(null);
    // The notice was about an earlier ouverture. The shop entry stays in history: drop it from the
    // URL, so Back returns to a clean shop.
    const shopUrl = new URL(window.location.href);
    if (shopUrl.searchParams.has("notice")) {
      shopUrl.searchParams.delete("notice");
      window.history.replaceState(null, "", shopUrl);
    }

    const formData = new FormData();
    formData.set("locale", locale);
    formData.set("windowIndex", String(offer.windowIndex));
    formData.set("slotIndex", String(slotIndex));

    setOpeningSlot(slotIndex);
    startTransition(async () => {
      const res = await openShopSlot(formData);
      if (!res.ok) {
        setOpeningSlot(null);
        setError(t(`error.${res.error}`));
        if (refusalReloadsOffer(res.error)) router.refresh();
        return;
      }
      // openingSlot stays set: the emplacement shows its opening until the révélation replaces the shop.
      markPendingReveal(res.result.drawId);
      // An update after an await leaves the transition unless wrapped again: inside it, `pending`
      // keeps the emplacements disabled until the révélation shows.
      startTransition(() => router.push(`/boosters/opening/${res.result.drawId}`));
    });
  }

  if (!isLoggedIn) {
    return (
      <Surface className="p-6 text-center">
        <p className="text-muted">{t("loginRequired")}</p>
        <Link
          href={{ pathname: "/login", query: { returnTo: `/${locale}/boosters` } }}
          className="mt-4 inline-flex rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-strong"
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
      <ShopCountdown secondsAtRender={secondsLeft} windowIndex={offer.windowIndex} />
      {notice && !pending && (
        <p
          className="rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-foreground"
          role="status"
        >
          {t(`notice.${notice}`)}
        </p>
      )}
      {error && (
        <p className="text-sm text-red-300" role="alert">
          {error}
        </p>
      )}
      <ul className="mx-auto grid max-w-[48.5rem] grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4">
        {offer.slots.map((slot) => {
          const name = t(`pack.${slot.booster.slug}.name`);
          const isOpening = openingSlot === slot.slotIndex;
          const packState = slot.exhausted ? "exhausted" : isOpening ? "opening" : "idle";
          return (
            <li key={slot.slotIndex} className="flex min-w-0 flex-col items-center gap-2.5">
              <span className="sr-only">{`${name}, ${t("slots", { count: slot.booster.slots })}`}</span>
              <BoosterPack
                slug={slot.booster.slug}
                cardCount={slot.booster.slots}
                state={packState}
              />
              <p className="text-sm font-semibold text-amber-300">
                {t("cost", { amount: slot.booster.costCoins })}
              </p>
              {slot.exhausted ? (
                <p className="text-sm font-semibold text-muted">{t("exhausted")}</p>
              ) : (
                <Button
                  type="button"
                  className="w-full"
                  // The visible "Open" says nothing about the slot; while opening, the visible "Opening…" is the accessible name.
                  aria-label={
                    isOpening ? undefined : t("open", { name, position: slot.slotIndex + 1 })
                  }
                  onClick={() => handleOpen(slot.slotIndex)}
                  disabled={pending}
                >
                  {isOpening ? t("opening") : t("openCta")}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
