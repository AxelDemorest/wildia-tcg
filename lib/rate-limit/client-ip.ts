/**
 * The client address used as a rate-limit key: the first entry of x-forwarded-for (set by the
 * hosting proxy), else x-real-ip, else "unknown". Blank values are skipped.
 */
export function clientIpFromHeaders(get: (name: string) => string | null): string {
  const forwarded = get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  const realIp = get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}
