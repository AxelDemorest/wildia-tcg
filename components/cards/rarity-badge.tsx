"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { rarityAccentClass } from "@/lib/cards/rarity";
import type { CardRarity } from "@/lib/cards/types";

type Props = { rarity: CardRarity };

export function RarityBadge({ rarity }: Props) {
  const t = useTranslations("Catalog.rarity");
  return <Badge className={rarityAccentClass(rarity)}>{t(rarity)}</Badge>;
}
