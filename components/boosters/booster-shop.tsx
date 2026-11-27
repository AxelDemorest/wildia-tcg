"use client";

import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { BoosterShopSlot } from "@/components/boosters/booster-shop-slot";
import { ShopCountdown } from "@/components/boosters/shop-countdown";
import { Surface } from "@/components/ui/surface";
import { Link, useRouter } from "@/i18n/navigation";
import { refusalReloadsOffer } from "@/lib/boosters/open-shop-slot";
import { markPendingReveal } from "@/lib/boosters/pending-reveal";
import { shopWindowSeconds, type BoosterShopOffer } from "@/lib/boosters/shop";
import { parseShopNotice } from "@/lib/boosters/shop-notice";
import { openShopSlot } from "@/server/actions/open-booster";

type Props = {
  locale: string;
  offer: BoosterShopOffer | null;
  /** Seconds left in the offer's window, computed on the server at render. */
  secondsLeft: number;
  isLoggedIn: boolean;
  userId: string | null;
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
    </div>
  );
}
