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
        className="hidden text-sm font-medium text-muted transition hover:text-brand sm:inline"
      >
        {t("login")}
      </Link>
      <Link
        href="/signup"
        className="hidden rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-strong sm:inline-flex"
      >
        {t("signup")}
      </Link>
      <Link
        href="/login"
        className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-white bg-zinc-200 shadow-sm ring-1 ring-black/10 transition hover:ring-black/25"
        aria-label={t("login")}
      >
        <Image src={MOCK_AVATAR_PATH} alt="" fill sizes="40px" className="object-cover" priority />
      </Link>
    </>
  );
}
