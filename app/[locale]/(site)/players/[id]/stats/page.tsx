import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ProfileStatsPanel } from "@/components/profile/profile-stats-panel";
import { PLAYER_ID_RE } from "@/lib/profiles/hub";
import { getUser } from "@/server/auth/require-user";
import { getProfileCollectionStats } from "@/server/inventory/collection-stats";
import { getPublicProfileForViewer } from "@/server/profiles/queries";

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function PlayerStatsPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  if (!PLAYER_ID_RE.test(id)) notFound();

  const viewer = await getUser();
  const profile = await getPublicProfileForViewer(id, viewer?.id ?? null).catch(() => null);
  if (!profile) notFound();

  const isOwn = viewer?.id === profile.id;
  const stats = await getProfileCollectionStats(profile.id, locale, { includeOpens: isOwn });

  return <ProfileStatsPanel stats={stats} isOwn={isOwn} />;
}