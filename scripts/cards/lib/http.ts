export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly url: string,
    body: string,
  ) {
    super(`HTTP ${status} on ${url}: ${body.slice(0, 200)}`);
  }
}

const MAX_ATTEMPTS = 3;

/** Retries 429 and 5xx, honouring Retry-After / X-RateLimit-Reset when present. */
export async function fetchWithRetry(url: string, init: RequestInit = {}): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, init);
    const retryable = res.status === 429 || res.status >= 500;
    if (res.ok || !retryable || attempt >= MAX_ATTEMPTS) return res;

    const header = res.headers.get("retry-after") ?? res.headers.get("x-ratelimit-reset");
    const waitSeconds = header && /^\d+$/.test(header) ? Number(header) : 2 ** attempt;
    console.warn(`  ${res.status} sur ${new URL(url).host}, nouvel essai dans ${waitSeconds}s`);
    await sleep(waitSeconds * 1000);
  }
}

export async function fetchJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetchWithRetry(url, init);
  if (!res.ok) throw new HttpError(res.status, url, await res.text());
  return (await res.json()) as T;
}
