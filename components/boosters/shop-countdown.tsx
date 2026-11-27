"use client";

import { useRouter as useNextRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  createOfferReloader,
  formatCountdown,
  remainingSeconds,
  remainingShare,
} from "@/lib/boosters/shop-countdown";

/** Navigation entries this page already showed; a second sight means back/forward replayed stale data. */
const shownEntries = new Set<string>();

type Props = {
  /** Seconds left in the window, computed by the server when the page was rendered. */
  secondsAtRender: number;
  windowIndex: number;
  /** Full length of a window; the bar is full when one starts and empty when it ends. */
  windowSeconds: number;
};

export function ShopCountdown({ secondsAtRender, windowIndex, windowSeconds }: Props) {
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

  const share = remainingShare(secondsLeft, windowSeconds);
  const endingSoon = share <= 0.15;

  return (
    <div className="space-y-2">
      <p className="flex items-baseline justify-between gap-3 text-sm text-muted">
        <span>{t("countdownLabel")}</span>
        <span
          role="timer"
          className={`font-semibold tabular-nums transition-colors ${endingSoon ? "text-accent" : "text-foreground"}`}
        >
          {formatCountdown(secondsLeft)}
        </span>
      </p>
      <div aria-hidden className="h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06] ring-1 ring-inset ring-white/[0.05]">
        <div
          className={`h-full w-full origin-left rounded-full transition-[transform,background-color] duration-1000 ease-linear motion-reduce:transition-none ${
            endingSoon
              ? "bg-[linear-gradient(90deg,#c98a1a,var(--accent))]"
              : "bg-[linear-gradient(90deg,var(--brand),var(--secondary))]"
          }`}
          style={{ transform: `scaleX(${share})` }}
        />
      </div>
    </div>
  );
}
