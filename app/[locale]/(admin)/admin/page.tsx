import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireStaff } from "@/server/auth/require-staff";
import { staffPageMetadata } from "@/server/auth/staff-metadata";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return staffPageMetadata(locale, "home");
}

export default async function AdminHomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireStaff(locale, `/${locale}/admin`);
  const t = await getTranslations("Admin.home");

  return (
    <header className="flex flex-col gap-1">
      <h1 className="text-2xl/8 font-semibold text-admin-ink lg:text-[28px]/9">{t("title")}</h1>
      <p className="text-admin-muted">{t("subtitle")}</p>
    </header>
  );
}
