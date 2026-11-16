import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { SiteChat } from "@/components/layout/site-chat";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteStatsBar, SiteStatsBarShell } from "@/components/layout/site-stats-bar";
import { SiteHeader } from "@/components/site-header";
import { SiteHeaderSkeleton } from "@/components/site-header-skeleton";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function SiteLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Suspense fallback={<SiteStatsBarShell />}>
        <SiteStatsBar />
      </Suspense>
      <Suspense fallback={<SiteHeaderSkeleton />}>
        <SiteHeader locale={locale} />
      </Suspense>

      <div className="flex flex-1 items-start gap-5 px-3 py-5 sm:px-5">
        <div className="flex min-w-0 flex-1 flex-col gap-5 self-stretch">
          <main className="flex min-h-0 flex-1 flex-col">{children}</main>
          <SiteFooter />
        </div>

        <div className="sticky top-[7.25rem] hidden h-[calc(100dvh-8.25rem)] w-[19rem] shrink-0 xl:block">
          <Suspense fallback={<div className="h-full rounded-2xl border border-border bg-panel" aria-hidden />}>
            <SiteChat locale={locale} />
          </Suspense>
        </div>
      </div>
    </>
  );
}
