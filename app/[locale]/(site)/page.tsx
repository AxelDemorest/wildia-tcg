import { setRequestLocale } from "next-intl/server";
import { HomeCta } from "@/components/home/home-cta";
import { HomeFaq } from "@/components/home/home-faq";
import { HomeFeatures } from "@/components/home/home-features";
import { HomeHero } from "@/components/home/home-hero";
import { HomeHowItWorks } from "@/components/home/home-how-it-works";
import { HomeRecentDrawsSection } from "@/components/home/home-recent-draws-section";

type Props = { params: Promise<{ locale: string }> };

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <HomeHero locale={locale} />
      <HomeRecentDrawsSection locale={locale} />
      <HomeHowItWorks />
      <HomeFeatures />
      <HomeFaq />
      <HomeCta />
    </>
  );
}
