import Image from "next/image";
import { getFormatter, getTranslations } from "next-intl/server";
import { ProfileHubNav } from "@/components/profile/profile-hub-nav";
import type { CollectionStats } from "@/lib/inventory/collection-stats";
import { getProfileBannerPublicUrl } from "@/lib/profiles/banner-url";
import { MOCK_AVATAR_PATH } from "@/lib/profiles/mock-avatar";
import type { PublicProfile } from "@/lib/profiles/types";

type Props = {
  profile: PublicProfile;
  isOwn: boolean;
  locale: string;
  stats: CollectionStats;
  children: React.ReactNode;
};

export async function ProfileHubShell({ profile, isOwn, children }: Props) {
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
    <div className="flex w-full flex-col gap-5">
      <header className="relative isolate -mx-3 -mt-5 w-[calc(100%+1.5rem)] overflow-hidden bg-panel sm:-mx-5 sm:w-[calc(100%+2.5rem)]">
        <div
          aria-hidden
          className={`absolute inset-0 -z-20 bg-[linear-gradient(115deg,#04211a_0%,#0b4a33_38%,#17684a_72%,#0a2a1f_100%)] opacity-40 ${bannerUrl ? "bg-cover bg-center" : ""}`}
          style={bannerUrl ? { backgroundImage: `url(${bannerUrl})` } : undefined}
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-r from-black/85 via-black/60 to-black/20"
        />

        <div className="flex flex-col gap-6 px-5 pt-8 sm:px-8 sm:pt-12 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 items-center gap-4 sm:gap-5">
            <span className="relative size-16 shrink-0 overflow-hidden rounded-2xl bg-panel ring-2 ring-white/15 sm:size-20">
              <Image
                src={MOCK_AVATAR_PATH}
                alt=""
                fill
                sizes="80px"
                className="object-cover"
              />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-3xl font-bold tracking-tight text-white sm:text-5xl">
                {displayName}
              </h1>
              <p className="mt-1.5 text-xs text-white/60 sm:mt-2 sm:text-sm">
                {tHub("memberSince", { date: memberSince })}
              </p>
            </div>
          </div>
        </div>

        <ProfileHubNav profileId={profile.id} isOwn={isOwn} />
      </header>

      <div className="flex min-w-0 flex-col gap-5">{children}</div>
    </div>
  );
}
