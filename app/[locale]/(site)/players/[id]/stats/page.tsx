import { setRequestLocale } from "next-intl/server";
import { ProfileHubTabPlaceholder } from "@/components/profile/profile-hub-tab-placeholder";

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function PlayerStatsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ProfileHubTabPlaceholder />;
}