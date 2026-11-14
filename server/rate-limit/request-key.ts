import "server-only";

import { headers } from "next/headers";

export async function getClientIpForRateLimit(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "unknown";
  return ip;
}
