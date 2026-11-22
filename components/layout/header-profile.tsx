import { getTranslations } from "next-intl/server";
import { HeaderProfileMenu } from "@/components/layout/header-profile-menu";
import { displayLabel } from "@/lib/profiles/display-label";
import { MOCK_AVATAR_PATH } from "@/lib/profiles/mock-avatar";
import { getOwnProfile } from "@/server/profiles/queries";

type Props = {
  userId: string;
  locale: string;
  email?: string | null;
};

export async function HeaderProfile({ userId, locale, email }: Props) {
  const tProfile = await getTranslations("Profile");
  const tHome = await getTranslations("Home");

  const profile = await getOwnProfile(userId).catch(() => null);
  const label = displayLabel(profile?.display_name, email, tProfile("anonymousName"));
  const avatarUrl = MOCK_AVATAR_PATH;

  return (
    <HeaderProfileMenu
      userId={userId}
      locale={locale}
      avatarUrl={avatarUrl}
      avatarAlt={label}
      logoutLabel={tHome("logout")}
      profileLabel={tHome("profile")}
      settingsLabel={tProfile("settingsTitle")}
    />
  );
}
