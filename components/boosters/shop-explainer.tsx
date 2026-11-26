import Image, { type StaticImageData } from "next/image";
import { useTranslations } from "next-intl";
import type { CSSProperties, ReactNode } from "react";
import cardBackAsset from "@/assets/brand/card-back.webp";
import { BoosterPack } from "@/components/boosters/booster-pack";
import { CoinIcon, SparkIcon } from "@/components/ui/icons";

const cardBack = cardBackAsset as StaticImageData;

const COIN_EDGE_LAYERS = [-2, -1, 0, 1, 2];

function RotatingShowcase() {
  return (
    <div className="shop-explainer-showcase">
      <div className="shop-explainer-orbit">
        <span className="shop-explainer-orbit-dot" />
      </div>
      <div className="shop-explainer-pack">
        <BoosterPack slug="premium" cardCount={5} state="idle" />
      </div>
    </div>
  );
}

function SpinningCoin() {
  return (
    <div className="shop-explainer-coin-stage">
      <div className="shop-explainer-coin">
        {COIN_EDGE_LAYERS.map((layer) => (
          <span key={layer} className="shop-explainer-coin-edge" style={{ "--layer": layer } as CSSProperties} />
        ))}
        <CoinIcon className="shop-explainer-coin-face shop-explainer-coin-front" />
        <CoinIcon className="shop-explainer-coin-face shop-explainer-coin-back" />
      </div>
      <div className="shop-explainer-coin-shadow" />
    </div>
  );
}

function FlippingCard() {
  return (
    <div className="shop-explainer-cards">
      <Image src={cardBack} alt="" sizes="4rem" className="shop-explainer-card shop-explainer-card-left" />
      <Image src={cardBack} alt="" sizes="4rem" className="shop-explainer-card shop-explainer-card-right" />
      <div className="shop-explainer-flip">
        <Image src={cardBack} alt="" sizes="4rem" className="shop-explainer-card shop-explainer-flip-back" />
        <div className="shop-explainer-card shop-explainer-flip-front">
          <SparkIcon className="size-6" />
        </div>
      </div>
    </div>
  );
}

const STEPS: { key: "rotation" | "price" | "reveal"; art: ReactNode }[] = [
  { key: "rotation", art: <RotatingShowcase /> },
  { key: "price", art: <SpinningCoin /> },
  { key: "reveal", art: <FlippingCard /> },
];

/** How the boutique boosters works, in three tiles with a small 3D illustration each. */
export function ShopExplainer() {
  const t = useTranslations("Boosters.explainer");
  return (
    <ul className="grid gap-3 md:grid-cols-3">
      {STEPS.map(({ key, art }) => (
        <li
          key={key}
          className="relative isolate flex min-h-36 items-center gap-4 overflow-hidden rounded-lg border border-white/[0.06] bg-surface py-4 pl-5 pr-3"
        >
          <div
            aria-hidden
            className="absolute -right-10 top-1/2 -z-10 size-44 -translate-y-1/2 rounded-full bg-brand/15 blur-3xl"
          />
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-foreground">{t(`${key}.title`)}</h2>
            <p className="mt-1 text-pretty text-sm leading-relaxed text-muted">{t(`${key}.body`)}</p>
          </div>
          <div aria-hidden className="shop-explainer-stage">
            {art}
          </div>
        </li>
      ))}
    </ul>
  );
}
