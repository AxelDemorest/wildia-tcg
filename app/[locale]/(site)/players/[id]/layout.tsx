import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ProfileHubShell } from "@/components/profile/profile-hub-shell";
import { PLAYER_ID_RE } from "@/lib/profiles/hub";
import { getUser } from "@/server/auth/require-user";
import { getProfileCollectionStats } from "@/server/inventory/collection-stats";
import { getPublicProfileForViewer } from "@/server/profiles/queries";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string; id: string }>;
};

export default async function PlayerHubLayout({ children, params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  if (!PLAYER_ID_RE.test(id)) notFound();

  const viewer = await getUser();
  const profile = await getPublicProfileForViewer(id, viewer?.id ?? null).catch(() => null);
  if (!profile) notFound();

  const isOwn = viewer?.id === profile.id;
  const stats = await getProfileCollectionStats(profile.id, locale, { includeOpens: isOwn });

  return (
    <ProfileHubShell profile={profile} isOwn={isOwn} locale={locale} stats={stats}>
      {children}
    </ProfileHubShell>
  );
}