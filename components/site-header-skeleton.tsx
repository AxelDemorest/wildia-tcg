import { HeaderCurrencyOrbSkeleton } from "@/components/layout/header-currency-orb-skeleton";
import { HeaderProfileSkeleton } from "@/components/layout/header-profile-skeleton";

export function SiteHeaderSkeleton() {
  return (
    <header className="shrink-0 border-0 bg-transparent">
      <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="h-10 w-28 rounded-lg bg-border" aria-hidden />
          <div className="hidden h-11 w-56 rounded-full bg-border md:block" aria-hidden />
          <div className="flex items-center justify-end gap-2.5">
            <HeaderCurrencyOrbSkeleton />
            <HeaderProfileSkeleton />
          </div>
        </div>
      </div>
    </header>
  );
}
