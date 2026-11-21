import Image from "next/image";
import { getFormatter, getTranslations } from "next-intl/server";
import { ProfileHubNav } from "@/components/profile/profile-hub-nav";
import { ProfileHubStatsPills } from "@/components/profile/profile-hub-stats-pills";
import { Surface } from "@/components/ui/surface";
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
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 lg:flex-row lg:items-start">
      <aside className="w-full shrink-0 lg:sticky lg:top-28 lg:w-72">
        <Surface className="overflow-hidden">
          <div
            className={`relative h-28 bg-[linear-gradient(115deg,#04211a_0%,#0b4a33_38%,#17684a_72%,#0a2a1f_100%)] ${bannerUrl ? "bg-cover bg-center" : ""}`}
            style={bannerUrl ? { backgroundImage: `url(${bannerUrl})` } : undefined}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-panel via-panel/20 to-transparent" />
          </div>
          <div className="-mt-10 flex flex-col gap-4 px-5 pb-5">
            <div className="relative mx-auto size-20 overflow-hidden rounded-2xl bg-gradient-to-br from-brand to-[#3fb985] p-0.5 lg:mx-0">
              <span className="relative block size-full overflow-hidden rounded-[14px] bg-panel">
                <Image
                  src={MOCK_AVATAR_PATH}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </span>
            </div>
            <div className="text-center lg:text-left">
              <h1 className="text-xl font-extrabold uppercase tracking-tight text-foreground">
                {displayName}
              </h1>
              <p className="mt-1 text-xs font-medium uppercase tracking-wider text-muted">
                {tHub("memberSince", { date: memberSince })}
              </p>
            </div>
            <ProfileHubNav profileId={profile.id} isOwn={isOwn} />
            <ProfileHubStatsPills stats={stats} isOwn={isOwn} />
            <button
              type="button"
              disabled
              className="w-full cursor-not-allowed rounded-xl border border-dashed border-white/15 bg-white/[0.03] px-3 py-2.5 text-sm font-semibold text-muted"
              title={tHub("binderWorldSoon")}
            >
              {tHub("binderWorld")}
              <span className="mt-0.5 block text-[11px] font-medium uppercase tracking-wide text-muted/80">
                {tHub("binderWorldSoon")}
              </span>
            </button>
          </div>
        </Surface>
      </aside>
      <div className="min-w-0 flex-1 flex flex-col gap-5">{children}</div>
    </div>
  );
}