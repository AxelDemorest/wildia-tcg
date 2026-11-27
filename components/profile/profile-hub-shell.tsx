import Image from "next/image";
import { getFormatter, getTranslations } from "next-intl/server";
import { ProfileHubNav } from "@/components/profile/profile-hub-nav";
import { ProfileHubStatsPills } from "@/components/profile/profile-hub-stats-pills";
import { Link } from "@/i18n/navigation";
import type { CollectionStats } from "@/lib/inventory/collection-stats";
import { getProfileBannerPublicUrl } from "@/lib/profiles/banner-url";
import { profileHubPath } from "@/lib/profiles/hub";
import { MOCK_AVATAR_PATH } from "@/lib/profiles/mock-avatar";
import type { PublicProfile } from "@/lib/profiles/types";

type Props = {
  profile: PublicProfile;
  isOwn: boolean;
  locale: string;
  stats: CollectionStats;
  children: React.ReactNode;
};

export async function ProfileHubShell({ profile, isOwn, stats, children }: Props) {
  const t = await getTranslations("Profile");
  const tHub = await getTranslations("Profile.hub");
  const format = await getFormatter();

  const bannerUrl = getProfileBannerPublicUrl(profile.banner_url);
  const displayName = profile.display_name ?? t("anonymousName");
  const memberSince = format.dateTime(new Date(profile.created_at), {
    year: "numeric",
    month: "long",
  });

  return (
    <div className="relative isolate flex w-full flex-col">
      <div
        aria-hidden
        className="absolute -top-5 -left-3 -z-10 h-56 w-[calc(100%+1.5rem)] overflow-hidden sm:-left-5 sm:h-72 sm:w-[calc(100%+2.5rem)]"
      >
        <div
          className={`absolute inset-0 bg-[linear-gradient(115deg,#04211a_0%,#0b4a33_38%,#17684a_72%,#0a2a1f_100%)] opacity-40 ${bannerUrl ? "bg-cover bg-center" : ""}`}
          style={bannerUrl ? { backgroundImage: `url(${bannerUrl})` } : undefined}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-background/50 to-background" />
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 pt-24 sm:px-4 sm:pt-36 lg:px-8">
        <header className="flex flex-col gap-6 rounded-lg border border-white/[0.07] bg-surface/80 p-5 backdrop-blur-md sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <span className="relative size-16 shrink-0 overflow-hidden rounded-md bg-surface ring-1 ring-white/10 sm:size-[72px]">
                <Image
                  src={MOCK_AVATAR_PATH}
                  alt=""
                  fill
                  sizes="72px"
                  className="object-cover"
                />
              </span>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  {displayName}
                </h1>
                <p className="mt-1 text-xs text-muted sm:text-sm">
                  {tHub("memberSince", { date: memberSince })}
                </p>
              </div>
            </div>

            {isOwn && (
              <Link
                href={profileHubPath(profile.id, "settings")}
                className="inline-flex shrink-0 items-center justify-center self-start rounded-md border border-border-strong bg-white/[0.03] px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                {t("editProfile")}
              </Link>
            )}
          </div>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
            {profile.bio ? (
              <div className="min-w-0 flex-1 lg:max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  {t("bio")}
                </p>
                <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-muted">
                  {profile.bio}
                </p>
              </div>
            ) : (
              <span aria-hidden className="hidden lg:block lg:flex-1" />
            )}
            <ProfileHubStatsPills stats={stats} isOwn={isOwn} />
          </div>
        </header>

        <ProfileHubNav profileId={profile.id} isOwn={isOwn} />

        <div className="flex min-w-0 flex-col gap-5">{children}</div>
      </div>
    </div>
  );
}
