import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Surface } from "@/components/ui/surface";
import { PLAYER_ID_RE } from "@/lib/profiles/hub";
import { getUser } from "@/server/auth/require-user";
import { getPublicProfileForViewer } from "@/server/profiles/queries";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  if (!PLAYER_ID_RE.test(id)) return { title: "Player" };
  const viewer = await getUser();
  const profile = await getPublicProfileForViewer(id, viewer?.id ?? null).catch(() => null);
  if (!profile) return { title: "Player" };
  const name = profile.display_name ?? "Player";
  return {
    title: name,
    description: profile.bio ?? undefined,
  };
}

export default async function PlayerOverviewPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Profile");

  if (!PLAYER_ID_RE.test(id)) notFound();

  const viewer = await getUser();
  const profile = await getPublicProfileForViewer(id, viewer?.id ?? null).catch(() => null);
  if (!profile) notFound();

  return (
    <Surface className="space-y-4 p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">{t("hub.tabs.overview")}</h2>
      {profile.bio ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{profile.bio}</p>
      ) : (
        <p className="text-sm text-muted">{t("noBio")}</p>
      )}
      {!profile.is_public && viewer?.id === profile.id && (
        <p className="text-xs text-muted">{t("hub.privateNotice")}</p>
      )}
      {viewer?.id !== profile.id && profile.locale !== locale && (
        <p className="text-xs text-muted">{t("localeHint", { locale: profile.locale })}</p>
      )}
    </Surface>
  );
}