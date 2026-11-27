import { HeaderCurrencyOrbSkeleton } from "@/components/layout/header-currency-orb-skeleton";
import { HeaderProfileSkeleton } from "@/components/layout/header-profile-skeleton";

export function SiteHeaderSkeleton() {
  return (
    <header className="sticky top-0 z-40 shrink-0 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="flex min-h-[4.5rem] items-center gap-4 px-4 py-2 sm:px-6">
        <div className="h-8 w-32 animate-pulse rounded-md bg-surface" aria-hidden />
        <div className="ml-2 hidden h-9 w-[30rem] animate-pulse rounded-md bg-surface lg:block" aria-hidden />
        <div className="ml-auto flex items-center gap-3">
          <HeaderCurrencyOrbSkeleton />
          <HeaderProfileSkeleton />
        </div>
      </div>
    </header>
  );
}
