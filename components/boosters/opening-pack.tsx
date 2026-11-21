"use client";

import {
  useEffect,
  useRef,
  useSyncExternalStore,
  type CSSProperties,
  type Dispatch,
  type PointerEvent,
} from "react";
import { useTranslations } from "next-intl";
import { BoosterPack } from "@/components/boosters/booster-pack";
import { CardPile } from "@/components/boosters/card-pile";
import { TradingCard } from "@/components/cards/trading-card";
import { Button } from "@/components/ui/button";
import { isPrimaryPress } from "@/lib/boosters/pointer-press";
import {
  nextPackTimer,
  packTimerKey,
  PACK_BURST_MS,
  PACK_CHARGE_MS,
  type CeremonyAction,
  type PackCeremony,
} from "@/lib/boosters/reveal-ceremony";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

// The CSS durations of the charge and the burst (see `.reveal-pack` in globals.css), from the timers
// that end them.
const durations = {
  "--pack-charge": `${PACK_CHARGE_MS}ms`,
  "--pack-burst": `${PACK_BURST_MS}ms`,
} as CSSProperties;

const SPARK_COUNT = 12;

/** One hint per step, none during the burst; under reduced motion a click opens the pack at once. */
function packHint(step: PackCeremony["step"], reducedMotion: boolean) {
  if (step === "charging") return "packChargingHint";
  if (step === "bursting") return null;
  return reducedMotion ? "packClickHint" : "packHoldHint";
}

type Props = {
  ceremony: PackCeremony;
  dispatch: Dispatch<CeremonyAction>;
  /** The booster whose pack this is. */
  slug: string;
};

/**
 * The pack of an ouverture, before its pile: held, it charges then bursts into the face-down pile;
 * its activation (keyboard, screen reader, a quick click) runs the charge by itself.
 */
export function OpeningPack({ ceremony, dispatch, slug }: Props) {
  const t = useTranslations("Boosters");
  const reducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
  const packRef = useRef<HTMLButtonElement>(null);
  // When the pointer press on the pack began, until it ends.
  const pressStartRef = useRef<number | null>(null);
  // From a pointer press to its click: that click is part of the press, not an activation.
  const pointerClickRef = useRef(false);
  const { step, prepared } = ceremony;
  const cardCount = prepared.stack.length;
  const hint = packHint(step, reducedMotion);

  // The pack keeps the focus until the pile shows.
  useEffect(() => {
    packRef.current?.focus();
  }, []);

  const ceremonyRef = useRef(ceremony);
  useEffect(() => {
    ceremonyRef.current = ceremony;
  }, [ceremony]);

  // A tap's release returns a new state but keeps the charge's timer running: the effect follows the
  // timer's key, not the state, so the burst stays in step with the gauge.
  const timerKey = packTimerKey(ceremony);
  useEffect(() => {
    const timer = nextPackTimer(ceremonyRef.current);
    if (!timer) return;
    const timeout = setTimeout(() => dispatch(timer.action), timer.delayMs);
    return () => clearTimeout(timeout);
  }, [timerKey, dispatch]);

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") dispatch({ type: "skip" });
    };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [dispatch]);

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    // Nothing to hold under reduced motion: the click opens the pack. A right or middle click, or a
    // second finger, does not charge it.
    if (reducedMotion || !isPrimaryPress(event)) return;
    // The release reaches the pack even when the pointer has left it.
    event.currentTarget.setPointerCapture(event.pointerId);
    pressStartRef.current = performance.now();
    pointerClickRef.current = true;
    dispatch({ type: "press", by: "pointer", reducedMotion: false });
  }

  function handlePointerEnd() {
    if (pressStartRef.current === null) return;
    dispatch({ type: "release", heldMs: performance.now() - pressStartRef.current });
    pressStartRef.current = null;
  }

  // A cancelled press fires no click: the next activation must not be taken for its click.
  function handlePointerCancel() {
    handlePointerEnd();
    pointerClickRef.current = false;
  }

  // An activation with no pointer press to hold (Enter, Space, a screen reader, any click under
  // reduced motion): the charge runs by itself, as from the keyboard.
  function handleClick() {
    if (pointerClickRef.current) {
      pointerClickRef.current = false;
      return;
    }
    dispatch({ type: "press", by: "activation", reducedMotion });
  }

  return (
    <div
      className="reveal-pack flex flex-col items-center gap-6 py-4"
      data-step={step}
      style={durations}
    >
      <p aria-live="polite" className="sr-only">
        {step === "rest" ? "" : t("packOpening")}
      </p>
      {/* The pack's scene: the burst lays the pile of backs at the pack's centre, exactly where
          the révélation shows it. */}
      <div className="reveal-scene reveal-scene-pack">
        <button
          ref={packRef}
          type="button"
          aria-label={t("openPack", { name: t(`pack.${slug}.name`) })}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerCancel}
          onClick={handleClick}
          // A long press on a phone would open the context menu.
          onContextMenu={(event) => event.preventDefault()}
          className="reveal-pack-button rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <div className="reveal-pack-charge">
            <BoosterPack slug={slug} state="idle" cardCount={cardCount} />
            <span aria-hidden className="reveal-pack-seam" />
            <span aria-hidden className="reveal-pack-seam" />
            <span aria-hidden className="reveal-pack-seam" />
          </div>
        </button>
        {step === "charging" && (
          <div aria-hidden className="reveal-pack-gauge">
            <span />
          </div>
        )}
        {/* The cards come out over the bursting pack, under the sparks and the flash. */}
        {step === "bursting" && (
          <div aria-hidden>
            <div className="reveal-pack-pile absolute inset-0 grid place-items-center">
              <CardPile under={cardCount - 1}>
                <TradingCard side="back" />
              </CardPile>
            </div>
            {Array.from({ length: SPARK_COUNT }, (_, index) => (
              <span
                key={index}
                className="reveal-pack-spark"
                style={{ rotate: `${(360 / SPARK_COUNT) * index}deg` }}
              />
            ))}
            <div className="reveal-pack-flash" />
          </div>
        )}
      </div>
      <p aria-hidden className="min-h-5 text-sm text-muted">
        {hint && t(hint)}
      </p>
      {!reducedMotion && (
        <Button variant="secondary" size="sm" onClick={() => dispatch({ type: "skip" })}>
          {t("skip")}
        </Button>
      )}
    </div>
  );
}
