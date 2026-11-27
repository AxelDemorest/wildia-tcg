import Image, { type StaticImageData } from "next/image";
import { useTranslations } from "next-intl";
import cardBackAsset from "@/assets/brand/card-back.webp";

const cardBack = cardBackAsset as StaticImageData;

type Props = { priority?: boolean };

/** Same brand visual for every card: it must never hint at the species or the rarity. */
export function CardBack({ priority }: Props) {
  const t = useTranslations("Catalog");
  return (
    <article data-side="back" className="tcg-card tcg-card-back">
      <Image
        src={cardBack}
        alt={t("cardBack")}
        fill
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
        className="object-cover"
        placeholder="blur"
        priority={priority}
      />
    </article>
  );
}
