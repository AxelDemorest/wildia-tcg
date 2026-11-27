import "server-only";

import { checkRateLimit } from "@/lib/rate-limit/check";
import { getClientIpForRateLimit } from "@/server/rate-limit/request-key";

const AUTH_LIMIT = 20;
const AUTH_WINDOW_MS = 60_000;
const SIGNUP_ADDRESS_LIMIT = 1;
const SIGNUP_ADDRESS_WINDOW_MS = 60_000;
const CONTEST_LIMIT = 5;
const CONTEST_WINDOW_MS = 60_000;
const OPEN_BOOSTER_LIMIT = 12;
const OPEN_BOOSTER_WINDOW_MS = 60_000;

export async function assertAuthRateLimit(): Promise<boolean> {
  const ip = await getClientIpForRateLimit();
  return checkRateLimit(`auth:${ip}`, AUTH_LIMIT, AUTH_WINDOW_MS).allowed;
}

/** One e-mail sign-up per address and minute; `address` is normalized (trimmed, lower case). */
export async function assertSignUpAddressRateLimit(address: string): Promise<boolean> {
  return checkRateLimit(`signup:${address}`, SIGNUP_ADDRESS_LIMIT, SIGNUP_ADDRESS_WINDOW_MS)
    .allowed;
}

export async function assertContestRateLimit(): Promise<boolean> {
  const ip = await getClientIpForRateLimit();
  return checkRateLimit(`contest:${ip}`, CONTEST_LIMIT, CONTEST_WINDOW_MS).allowed;
}

export async function assertOpenBoosterRateLimit(userId: string): Promise<boolean> {
  return checkRateLimit(`open_booster:${userId}`, OPEN_BOOSTER_LIMIT, OPEN_BOOSTER_WINDOW_MS)
    .allowed;
}
