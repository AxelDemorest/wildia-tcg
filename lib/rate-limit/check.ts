type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterMs: number };

/** Fixed-window counter (in-process). Documented for single-instance / dev; use KV in multi-instance prod. */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  nowMs: number = Date.now(),
): RateLimitResult {
  const entry = store.get(key);
  if (!entry || nowMs >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: nowMs + windowMs });
    return { allowed: true };
  }
  if (entry.count >= limit) {
    return { allowed: false, retryAfterMs: Math.max(0, entry.resetAt - nowMs) };
  }
  entry.count += 1;
  return { allowed: true };
}

/** Test helper — clears the in-memory store. */
export function resetRateLimitStore(): void {
  store.clear();
}
