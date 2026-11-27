import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
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

export default async function PlayerHubIndexPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  if (!PLAYER_ID_RE.test(id)) notFound();

  redirect(`/${locale}/players/${id}/collection`);
}