import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DevGrantForm } from "@/components/dev/dev-grant-form";
import { Surface } from "@/components/ui/surface";
import { isDevGrantsEnabled } from "@/lib/env";
import { requireUser } from "@/server/auth/require-user";
import { listCatalogCards } from "@/server/cards/queries";

type Props = { params: Promise<{ locale: string }> };

export default async function DevGrantsPage({ params }: Props) {
  if (!isDevGrantsEnabled()) {
    notFound();
  }

  const { locale } = await params;
  setRequestLocale(locale);
  await requireUser(locale);
  const t = await getTranslations("DevGrants");
  const cards = await listCatalogCards(locale);

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-brand-strong">{t("title")}</h1>
      <p className="mt-2 text-sm text-muted">{t("subtitle")}</p>
      <Surface className="mt-6 p-6">
        <DevGrantForm locale={locale} cards={cards} />
      </Surface>
    </div>
  );
}
