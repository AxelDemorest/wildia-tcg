import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ProfileShowcaseGrid } from "@/components/profile/profile-showcase-grid";
import { PLAYER_ID_RE } from "@/lib/profiles/hub";
import { getUser } from "@/server/auth/require-user";
import { getPublicProfileForViewer } from "@/server/profiles/queries";
import { getProfileShowcaseView } from "@/server/profiles/showcase-page";

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function PlayerShowcasePage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  if (!PLAYER_ID_RE.test(id)) notFound();

  const viewer = await getUser();
  const profile = await getPublicProfileForViewer(id, viewer?.id ?? null).catch(() => null);
  if (!profile) notFound();

  const isOwn = viewer?.id === profile.id;
  const slots = await getProfileShowcaseView(profile.id, locale);

  return <ProfileShowcaseGrid slots={slots} isOwn={isOwn} profileId={profile.id} />;
}