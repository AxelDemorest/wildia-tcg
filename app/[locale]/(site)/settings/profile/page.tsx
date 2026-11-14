import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProfileSettingsForm } from "@/components/profile/profile-settings-form";
import { getProfileBannerPublicUrl } from "@/lib/profiles/banner-url";
import { requireUser } from "@/server/auth/require-user";
import { listUserCollection } from "@/server/inventory/queries";
import { getOwnProfile } from "@/server/profiles/queries";
import { Link } from "@/i18n/navigation";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ProfileSettingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Profile");
  const user = await requireUser(locale);

  const profile = await getOwnProfile(user.id);
  const ownedCards = await listUserCollection(user.id, locale, "name");
  const bannerUrl = getProfileBannerPublicUrl(profile?.banner_url);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <header className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold text-brand-strong">{t("settingsTitle")}</h1>
        <p className="text-sm text-muted">{t("settingsSubtitle")}</p>
        <Link href={`/players/${user.id}`} className="text-sm font-medium text-brand hover:underline">
          {t("viewPublic")}
        </Link>
      </header>

      {bannerUrl && (
        <div
          className="mb-8 h-32 rounded-xl bg-cover bg-center ring-1 ring-border"
          style={{ backgroundImage: `url(${bannerUrl})` }}
          role="img"
          aria-label={t("bannerPreview")}
        />
      )}

      <ProfileSettingsForm
        locale={locale}
        displayName={profile?.display_name ?? null}
        bio={profile?.bio ?? null}
        isPublic={profile?.is_public ?? true}
        featuredCardId={profile?.featured_card_id ?? null}
        ownedCards={ownedCards}
      />
    </div>
  );
}
