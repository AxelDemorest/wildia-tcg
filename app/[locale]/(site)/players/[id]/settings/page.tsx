import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProfileSettingsForm } from "@/components/profile/profile-settings-form";
import { getProfileBannerPublicUrl } from "@/lib/profiles/banner-url";
import { PLAYER_ID_RE } from "@/lib/profiles/hub";
import { showcaseSlotsFromRows } from "@/lib/profiles/showcase";
import { getUser } from "@/server/auth/require-user";
import { listUserCollection } from "@/server/inventory/queries";
import { getOwnProfile } from "@/server/profiles/queries";
import { listShowcaseSlots } from "@/server/profiles/showcase";
import { Link } from "@/i18n/navigation";

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function PlayerSettingsPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Profile");

  if (!PLAYER_ID_RE.test(id)) notFound();

  const viewer = await getUser();
  if (viewer?.id !== id) notFound();

  const profile = await getOwnProfile(id);
  const ownedCards = await listUserCollection(id, locale, "name");
  const showcaseRows = await listShowcaseSlots(id);
  const bannerUrl = getProfileBannerPublicUrl(profile?.banner_url);

  return (
    <div className="flex w-full flex-col gap-5">
      <header className="space-y-1">
        <h2 className="text-2xl font-extrabold uppercase tracking-tight text-foreground">
          {t("settingsTitle")}
        </h2>
        <p className="text-sm text-muted">{t("settingsSubtitle")}</p>
        <Link
          href={`/players/${id}`}
          className="inline-flex text-sm font-semibold text-secondary transition hover:text-white"
        >
          {t("viewPublic")}
        </Link>
      </header>

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
        showcaseSlots={showcaseSlotsFromRows(showcaseRows)}
        ownedCards={ownedCards}
      />
    </div>
  );
}