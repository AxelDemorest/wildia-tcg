import Image, { type StaticImageData } from "next/image";
import { useTranslations } from "next-intl";
import boosterEmblemAsset from "@/assets/brand/booster-emblem.webp";
import { boosterPackLook } from "@/lib/boosters/booster-pack";

const boosterEmblem = boosterEmblemAsset as StaticImageData;

export type BoosterPackState = "idle" | "opening" | "exhausted";

type Props = {
  slug: string;
  state: BoosterPackState;
  cardCount: number;
};

/**
 * A filled booster pack, drawn in CSS (see `.booster-pack` in globals.css). The text on it is
 * decorative: the surrounding slot carries the accessible name of the booster.
 */
export function BoosterPack({ slug, state, cardCount }: Props) {
  const t = useTranslations("Boosters");
  return (
    <div className="booster-pack" data-state={state} data-look={boosterPackLook(slug)} aria-hidden>
      <div className="booster-pack-body">
        <div className="booster-pack-foil">
          <div className="booster-pack-arc booster-pack-arc-a" />
          <div className="booster-pack-arc booster-pack-arc-b" />
          <div className="booster-pack-rays" />
          <div className="booster-pack-frame" />
          <Image src={boosterEmblem} alt="" className="booster-pack-emblem" sizes="7rem" />
          <div className="booster-pack-label">
            <span className="booster-pack-kicker">{t("packKicker")}</span>
            <span className="booster-pack-name">{t(`pack.${slug}.short`)}</span>
          </div>
          <span className="booster-pack-count">{t("slots", { count: cardCount })}</span>
          <div className="booster-pack-cards" />
          <div className="booster-pack-taper booster-pack-taper-top" />
          <div className="booster-pack-taper booster-pack-taper-bottom" />
          <div className="booster-pack-crease booster-pack-crease-tl" />
          <div className="booster-pack-crease booster-pack-crease-tr" />
          <div className="booster-pack-crease booster-pack-crease-bl" />
          <div className="booster-pack-crease booster-pack-crease-br" />
          <div className="booster-pack-crumple" />
          <div className="booster-pack-shade" />
          <div className="booster-pack-seal booster-pack-seal-top">
            <span className="booster-pack-brand">Wildia</span>
          </div>
          <div className="booster-pack-seal booster-pack-seal-bottom" />
          <div className="booster-pack-tear" />
          <div className="booster-pack-holo" />
          <div className="booster-pack-gloss" />
        </div>
        {state === "exhausted" && <span className="booster-pack-stamp">{t("exhausted")}</span>}
      </div>
      <div className="booster-pack-ground" />
    </div>
  );
}
