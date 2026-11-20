import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Surface } from "@/components/ui/surface";
import { Link } from "@/i18n/navigation";
import { PLAYER_ID_RE } from "@/lib/profiles/hub";
import { getUser } from "@/server/auth/require-user";

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function PlayerSettingsPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Profile");

  if (!PLAYER_ID_RE.test(id)) notFound();

  const viewer = await getUser();
  if (viewer?.id !== id) notFound();

  return (
    <Surface className="space-y-4 p-6">
      <h2 className="text-lg font-bold text-foreground">{t("hub.tabs.settings")}</h2>
      <p className="text-sm text-muted">{t("hub.tabSoonBody")}</p>
      <Link
        href="/settings/profile"
        className="inline-flex rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-strong"
      >
        {t("editProfile")}
      </Link>
    </Surface>
  );
}