import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { MOCK_AVATAR_PATH } from "@/lib/profiles/mock-avatar";

export async function HeaderGuestActions() {
  const t = await getTranslations("Home");

  return (
    <>
      <Link
        href="/login"
        className="hidden text-sm font-medium text-muted transition hover:text-white sm:inline"
      >
        {t("login")}
      </Link>
      <Link
        href="/signup"
        className="hidden h-9 items-center rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-strong sm:inline-flex"
      >
        {t("signup")}
      </Link>
      <Link
        href="/login"
        className="relative size-9 shrink-0 overflow-hidden rounded-md bg-surface"
        aria-label={t("login")}
      >
        <Image src={MOCK_AVATAR_PATH} alt="" fill sizes="36px" className="object-cover" priority />
      </Link>
    </>
  );
}
