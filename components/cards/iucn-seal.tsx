"use client";

import { useTranslations } from "next-intl";
import { iucnSolidClass } from "@/lib/cards/iucn";
import type { IucnStatus } from "@/lib/cards/types";

type Props = { status: IucnStatus };

/** Pill with the two-letter IUCN code, shown in the card header. */
export function IucnSeal({ status }: Props) {
  const t = useTranslations("Catalog.iucn");
  return (
    <span
      className={`tcg-card-seal ${iucnSolidClass(status)}`}
      title={`${t("title")} : ${t(status)}`}
      aria-label={`${t("title")} : ${t(status)}`}
    >
      {status}
    </span>
  );
}
