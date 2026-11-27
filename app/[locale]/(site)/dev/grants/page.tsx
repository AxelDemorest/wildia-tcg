import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DevGrantForm } from "@/components/dev/dev-grant-form";
import { PageHeader } from "@/components/ui/page-header";
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
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <Surface className="p-6">
        <DevGrantForm locale={locale} cards={cards} />
      </Surface>
    </div>
  );
}
