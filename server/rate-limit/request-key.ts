import "server-only";

import { headers } from "next/headers";
import { clientIpFromHeaders } from "@/lib/rate-limit/client-ip";

export async function getClientIpForRateLimit(): Promise<string> {
  const h = await headers();
  return clientIpFromHeaders((name) => h.get(name));
}
