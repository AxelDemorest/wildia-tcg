/**
 * Reads the mails the local Supabase sends: Mailpit's HTTP API (supabase start, port 54324).
 * Used by the e2e journeys and the integration tests, so it imports nothing from Supabase.
 * Any non-local URL stops the run: the API reads a whole mailbox, and a mail's link is opened.
 */
const DEFAULT_BASE = "http://127.0.0.1:54324";
const LOCAL_URL = /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/;

function mailpitBase(): string {
  const base = (process.env.MAILPIT_URL ?? DEFAULT_BASE).replace(/\/$/, "");
  if (!LOCAL_URL.test(base)) {
    throw new Error(`Mailpit ne se lit qu'en local (npx supabase start), pas sur ${base}.`);
  }
  return base;
}

export type MailpitMessage = {
  id: string;
  subject: string;
  html: string;
  /** When Mailpit received it, as an ISO date. */
  created: string;
};

type Summary = { ID: string; Created: string };
type Detail = { ID: string; Subject: string; HTML: string };

/**
 * The `nth` (1-based, oldest first) message sent to `address`, waiting until it arrives.
 * Throws when it has not arrived within `timeoutMs`.
 */
export async function waitForMessage(
  address: string,
  { nth = 1, timeoutMs = 15_000 }: { nth?: number; timeoutMs?: number } = {},
): Promise<MailpitMessage> {
  const base = mailpitBase();
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const search = await fetch(
      `${base}/api/v1/search?query=${encodeURIComponent(`to:"${address}"`)}&limit=100`,
    );
    if (!search.ok) throw new Error(`Mailpit /search : ${search.status}`);
    const { messages } = (await search.json()) as { messages: Summary[] };
    const ordered = [...messages].sort((a, b) => a.Created.localeCompare(b.Created));
    if (ordered.length >= nth) {
      const detail = await fetch(`${base}/api/v1/message/${ordered[nth - 1].ID}`);
      if (!detail.ok) throw new Error(`Mailpit /message : ${detail.status}`);
      const message = (await detail.json()) as Detail;
      return {
        id: message.ID,
        subject: message.Subject,
        html: message.HTML,
        created: ordered[nth - 1].Created,
      };
    }
    if (Date.now() > deadline) {
      throw new Error(`Mailpit : ${ordered.length} mail(s) pour ${address}, ${nth} attendu(s).`);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

/**
 * The `/{locale}/auth/confirm` link of a mail (not its first link), which carries the
 * `token_hash`. Throws when the mail has none, or when the link does not point at the local app.
 */
export function confirmLink(message: Pick<MailpitMessage, "html">): string {
  const hrefs = [...message.html.matchAll(/href=["']([^"']+)["']/gi)].map((match) =>
    match[1].replaceAll("&amp;", "&"),
  );
  const link = hrefs.find((href) => /\/auth\/confirm\?.*token_hash=/.test(href));
  if (!link) throw new Error("Aucun lien /auth/confirm?…token_hash= dans le mail.");
  if (!LOCAL_URL.test(link)) {
    throw new Error(`Le lien de confirmation ne vise pas l'app locale : ${link}`);
  }
  return link;
}

/** The confirmation link of the `nth` message sent to `address`. */
export async function waitForConfirmLink(
  address: string,
  options?: { nth?: number; timeoutMs?: number },
): Promise<string> {
  return confirmLink(await waitForMessage(address, options));
}
