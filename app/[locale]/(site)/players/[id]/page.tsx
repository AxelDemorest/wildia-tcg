import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { TradingCard } from "@/components/cards/trading-card";
import { Surface } from "@/components/ui/surface";
import { Link } from "@/i18n/navigation";
import { getProfileBannerPublicUrl } from "@/lib/profiles/banner-url";
import { getUser } from "@/server/auth/require-user";
import { getCatalogCardById } from "@/server/cards/queries";
import { getPublicProfileForViewer } from "@/server/profiles/queries";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  if (!UUID_RE.test(id)) return { title: "Player" };
  const viewer = await getUser();
  const profile = await getPublicProfileForViewer(id, viewer?.id ?? null).catch(() => null);
  if (!profile) return { title: "Player" };
  const name = profile.display_name ?? "Player";
  return {
    title: name,
    description: profile.bio ?? undefined,
  };
}

export default async function PublicPlayerPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Profile");

  if (!UUID_RE.test(id)) notFound();

  const viewer = await getUser();
  const profile = await getPublicProfileForViewer(id, viewer?.id ?? null).catch(() => null);
  if (!profile) notFound();

  const bannerUrl = getProfileBannerPublicUrl(profile.banner_url);
  const featured =
    profile.featured_card_id != null
      ? await getCatalogCardById(locale, profile.featured_card_id).catch(() => null)
      : null;

  const isOwn = viewer?.id === profile.id;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <div
        className={`relative h-48 overflow-hidden rounded-2xl border border-white/[0.06] bg-[linear-gradient(115deg,#04211a_0%,#0b4a33_38%,#17684a_72%,#0a2a1f_100%)] ${bannerUrl ? "bg-cover bg-center" : ""}`}
        style={bannerUrl ? { backgroundImage: `url(${bannerUrl})` } : undefined}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-2xl font-extrabold uppercase tracking-tight text-white drop-shadow sm:text-3xl">
            {profile.display_name ?? t("anonymousName")}
          </h1>
        </div>
      </div>

      <Surface className="space-y-4 p-6">
        {profile.bio ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{profile.bio}</p>
        ) : (
          <p className="text-sm text-muted">{t("noBio")}</p>
        )}

        {isOwn && (
          <Link href="/settings/profile" className="text-sm font-semibold text-brand transition hover:text-secondary">
            {t("editProfile")}
          </Link>
        )}

        {!isOwn && profile.locale !== locale && (
          <p className="text-xs text-muted">{t("localeHint", { locale: profile.locale })}</p>
        )}
      </Surface>

      {featured && (
        <section className="rounded-2xl border border-border bg-surface/80 p-6 backdrop-blur-md">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">{t("featuredTitle")}</h2>
          <div className="max-w-xs">
            <TradingCard card={featured} href={`/cards/${featured.slug}`} priorityImage />
          </div>
        </section>
      )}
    </div>
  );
}
