import { useTranslations } from "next-intl";
import { BoosterPack } from "@/components/boosters/booster-pack";
import { ArrowRightIcon, CoinIcon, SparkIcon } from "@/components/ui/icons";
import { boosterPackLook } from "@/lib/boosters/booster-pack";
import type { BoosterShopSlot as Slot } from "@/lib/boosters/shop";

type Props = {
  slot: Slot;
  isOpening: boolean;
  disabled: boolean;
  onOpen: (slotIndex: number) => void;
};

const wellGlow = {
  standard: "bg-[radial-gradient(circle_at_50%_45%,rgb(79_214_156/0.16),transparent_65%)]",
  premium: "bg-[radial-gradient(circle_at_50%_45%,rgb(228_196_110/0.2),transparent_65%)]",
} as const;

export function BoosterShopSlot({ slot, isOpening, disabled, onOpen }: Props) {
  const t = useTranslations("Boosters");
  const name = t(`pack.${slot.booster.slug}.name`);
  const look = boosterPackLook(slot.booster.slug);
  const packState = slot.exhausted ? "exhausted" : isOpening ? "opening" : "idle";
  const cost = t("cost", { amount: slot.booster.costCoins });

  return (
    <li
      className={`group flex min-w-0 flex-col rounded-xl border bg-surface p-2.5 transition-colors ${
        isOpening ? "border-secondary/40" : "border-white/[0.07] hover:border-border-strong"
      }`}
    >
      <span className="sr-only">{`${name}, ${t("slots", { count: slot.booster.slots })}`}</span>

      <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-lg bg-black/35 ring-1 ring-inset ring-white/[0.04]">
        <div aria-hidden className={`absolute inset-0 ${wellGlow[look]}`} />
        {look === "premium" && (
          <span
            aria-hidden
            className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-amber-200 backdrop-blur-sm"
          >
            <SparkIcon className="size-3" />
            {t(`pack.${slot.booster.slug}.short`)}
          </span>
        )}
        <div className="relative flex w-[64%] justify-center">
          <BoosterPack slug={slot.booster.slug} cardCount={slot.booster.slots} state={packState} />
        </div>
      </div>

      <div aria-hidden className="mt-3 min-w-0 px-1">
        <p className="truncate text-sm font-semibold text-foreground sm:text-[15px]">{name}</p>
        <p className="mt-0.5 text-xs text-muted sm:text-sm">
          {t("slots", { count: slot.booster.slots })}
        </p>
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 px-1 pb-0.5 pt-4">
        <p className={`flex items-center gap-1.5 ${slot.exhausted ? "opacity-50" : ""}`}>
          <CoinIcon className="size-4 shrink-0 sm:size-[18px]" />
          <span aria-hidden className="text-lg font-bold tabular-nums text-foreground">
            {slot.booster.costCoins}
          </span>
          <span className="sr-only">{cost}</span>
        </p>

        {slot.exhausted ? (
          <p className="rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-muted">
            {t("exhausted")}
          </p>
        ) : (
          <button
            type="button"
            // The visible "Open" says nothing about the slot; while opening, the visible "Opening…" is the accessible name.
            aria-label={isOpening ? undefined : t("open", { name, position: slot.slotIndex + 1 })}
            onClick={() => onOpen(slot.slotIndex)}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 rounded-full border border-secondary/25 bg-brand/90 px-3.5 py-1.5 text-xs font-semibold text-white shadow-[0_6px_18px_-8px_rgb(79_214_156/0.7)] transition hover:border-secondary/50 hover:bg-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:border-white/[0.07] disabled:bg-white/[0.06] disabled:text-white/40 disabled:shadow-none sm:text-sm"
          >
            {isOpening ? t("opening") : t("openCta")}
            {!isOpening && (
              <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            )}
          </button>
        )}
      </div>
    </li>
  );
}
