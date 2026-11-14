import { routing } from "@/i18n/routing";

/** True for `/` or `/{locale}` (no trailing segment). */
export function isHomePath(pathname: string): boolean {
  const path = pathname.replace(/\/$/, "") || "/";
  if (path === "/") return true;
  return routing.locales.some((locale) => path === `/${locale}`);
}
