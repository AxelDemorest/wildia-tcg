"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { iucnAccentClass } from "@/lib/cards/iucn";
import type { IucnStatus } from "@/lib/cards/types";

type Props = {
  status: IucnStatus;
  /** Shows the full category name next to the code. */
  withLabel?: boolean;
};

export function IucnBadge({ status, withLabel }: Props) {
  const t = useTranslations("Catalog.iucn");
  const label = t(status);
  return (
    <Badge className={iucnAccentClass(status)}>
      <abbr title={`${t("title")} : ${label}`} className="no-underline">
        {status}
      </abbr>
      {withLabel && <span className="ml-1 font-medium normal-case tracking-normal">· {label}</span>}
    </Badge>
  );
}
