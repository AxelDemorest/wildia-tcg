import "server-only";

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SETTINGS_ROLE } from "@/lib/admin/setting-values";
import type { TeamRole } from "@/lib/auth/staff-session";
import { getStaffSession } from "@/server/auth/require-staff";

type StaffPage = "home" | "accounts" | "settings";

/** The rôle d’équipe a page is reserved to; the others are open to every membre équipe. */
const PAGE_ROLES: Partial<Record<StaffPage, TeamRole>> = { settings: SETTINGS_ROLE };

/**
 * The generateMetadata of every admin page. The body of requireStaff's redirect carries this
 * metadata too: no admin title and no robots meta for anyone the page sends away.
 */
export async function staffPageMetadata(locale: string, page: StaffPage): Promise<Metadata> {
  if (!(await getStaffSession(locale, PAGE_ROLES[page]))) return {};
  const t = await getTranslations({ locale, namespace: "Admin" });
  return {
    title: t("documentTitle", { page: t(`${page}.title`) }),
    robots: { index: false, follow: false },
  };
}
