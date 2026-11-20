"use client";

import { useRouter as useNextRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  createOfferReloader,
  formatCountdown,
  remainingSeconds,
} from "@/lib/boosters/shop-countdown";

/** Navigation entries this page already showed; a second sight means back/forward replayed stale data. */
const shownEntries = new Set<string>();

type Props = {
  /** Seconds left in the window, computed by the server when the page was rendered. */
  secondsAtRender: number;
  windowIndex: number;
};

export function ShopCountdown({ secondsAtRender, windowIndex }: Props) {
  const t = useTranslations("Boosters");
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(secondsAtRender));
  // Lives as long as the component, across the effect restarts a refreshed offer causes.
  const [reloader] = useState(createOfferReloader);

  const { bfcacheId } = useNextRouter();
  const checkedEntry = useRef(false);

  // Back/forward replays the cached page data without refetching: reload the offer once.
  useEffect(() => {
    if (checkedEntry.current) return;
    checkedEntry.current = true;
    if (shownEntries.has(bfcacheId)) router.refresh();
    shownEntries.add(bfcacheId);
  }, [bfcacheId, router]);

  // Restarts from the server's value whenever a refreshed offer brings new props.
  useEffect(() => {
    const renderedAtMs = Date.now();

    function tick() {
      const nowMs = Date.now();
      const left = remainingSeconds(secondsAtRender, renderedAtMs, nowMs);
      setSecondsLeft(left);
      if (reloader.claimReload({ secondsLeft: left, windowIndex, nowMs })) router.refresh();
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [secondsAtRender, windowIndex, reloader, router]);

  return (
    <p className="text-sm text-muted">
      {t("countdownLabel")}{" "}
      <span role="timer" className="font-semibold tabular-nums text-foreground">
        {formatCountdown(secondsLeft)}
      </span>
    </p>
  );
}
