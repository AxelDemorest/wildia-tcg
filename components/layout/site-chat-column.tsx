"use client";

import type { ReactNode } from "react";
import { usePathname } from "@/i18n/navigation";

type Props = { children: ReactNode };

/** Chat column is part of the home layout only. The site layout itself does not re-render on navigation. */
export function SiteChatColumn({ children }: Props) {
  const pathname = usePathname();
  if (pathname !== "/" && pathname !== "") return null;

  return (
    <div className="sticky top-[7.25rem] hidden h-[calc(100dvh-8.25rem)] w-[19rem] shrink-0 xl:block">
      {children}
    </div>
  );
}
