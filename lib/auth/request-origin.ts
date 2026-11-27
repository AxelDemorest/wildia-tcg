/**
 * The public origin the visitor reached the site on, from the headers Next and the hosting proxy
 * set: `x-forwarded-proto` (http when absent) and `x-forwarded-host` (else `host`). Null when no
 * host is known.
 */
export function originFromHeaders(get: (name: string) => string | null): string | null {
  const host = get("x-forwarded-host") ?? get("host");
  if (!host) return null;
  return `${get("x-forwarded-proto") ?? "http"}://${host}`;
}
