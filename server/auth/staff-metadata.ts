import "server-only";

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getStaffSession } from "@/server/auth/require-staff";

/**
 * The generateMetadata of every admin page. The body of requireStaff's redirect carries this
 * metadata too: no admin title and no robots meta for anyone but a team member.
 */
export async function staffPageMetadata(
  locale: string,
  page: "home" | "accounts",
): Promise<Metadata> {
  if (!(await getStaffSession(locale))) return {};
  const t = await getTranslations({ locale, namespace: "Admin" });
  return {
    title: t("documentTitle", { page: t(`${page}.title`) }),
    robots: { index: false, follow: false },
  };
}
