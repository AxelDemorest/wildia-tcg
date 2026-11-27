import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import comingSoonImage from "@/assets/coming-soon.png";
import { BrandLogo } from "@/components/layout/brand-logo";
import { ContestSection } from "@/components/coming-soon/contest-section";
import { BrandWordmark } from "@/components/layout/brand-wordmark";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ComingSoon" });
  return { title: t("title"), description: t("description") };
}

export default async function ComingSoonPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("ComingSoon");

  return (
    <main className="flex h-dvh w-full flex-col gap-3 overflow-hidden p-3 sm:gap-4 sm:p-4 md:flex-row md:gap-5 md:p-5">
      <section className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[2rem] bg-background bg-[image:var(--background-shine)] md:rounded-[2.75rem]">
        <div className="@container flex min-h-0 flex-1 flex-col justify-start overflow-y-auto overflow-x-hidden px-7 pb-7 pt-10 sm:px-12 sm:pb-10 md:px-14 md:pt-14 [scrollbar-width:thin]">
          {/* The claws asset has ~16% transparent padding on its left: pull it back so it lines up with the text below. */}
          <div className="flex items-center gap-1 [--logo-h:clamp(3.5rem,9dvh,5.5rem)]">
            <BrandLogo
              alt=""
              aria-hidden
              priority
              className="ml-[calc(var(--logo-h)*-0.16)] h-[var(--logo-h)] w-auto shrink-0"
            />
            <BrandWordmark size="xl" />
          </div>

          <h1 className="mt-6 min-w-0 text-[clamp(1.875rem,min(7.6cqw,6.5dvh),3.75rem)] font-bold leading-[1.08] tracking-tight text-foreground md:mt-8">
            <span className="block">{t("taglineLine1")}</span>
            <span className="block">{t("taglineLine2")}</span>
          </h1>

          <p className="mt-5 max-w-2xl text-pretty text-[clamp(0.95rem,1.4vw,1.125rem)] leading-relaxed text-muted">
            {t("notice")}
          </p>

          <ContestSection locale={locale} />
        </div>
      </section>

      <section
        aria-hidden
        className="relative min-h-0 min-w-0 flex-1 max-md:h-[14dvh] max-md:flex-none overflow-hidden rounded-[2rem] md:rounded-[2.75rem]"
      >
        <Image
          src={comingSoonImage}
          alt=""
          fill
          priority
          sizes="(min-width: 768px) 50vw, 100vw"
          className="object-cover"
        />
      </section>
    </main>
  );
}
