import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
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
  const user = await requireUser(locale, `/${locale}/settings/profile`);

  const profile = await getOwnProfile(user.id);
  const ownedCards = await listUserCollection(user.id, locale, "name");
  const bannerUrl = getProfileBannerPublicUrl(profile?.banner_url);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <PageHeader title={t("settingsTitle")} subtitle={t("settingsSubtitle")}>
        <Link
          href={`/players/${user.id}`}
          className="inline-flex text-sm font-semibold text-secondary transition hover:text-white"
        >
          {t("viewPublic")}
        </Link>
      </PageHeader>

      {bannerUrl && (
        <div
          className="h-32 rounded-2xl bg-cover bg-center ring-1 ring-border"
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
