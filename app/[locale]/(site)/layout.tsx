import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { SiteFooter } from "@/components/layout/site-footer";
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
      <Suspense fallback={<SiteHeaderSkeleton />}>
        <SiteHeader locale={locale} />
      </Suspense>
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      <SiteFooter />
    </>
  );
}
