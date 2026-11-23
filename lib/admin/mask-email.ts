// By code point: half an emoji would be a lone surrogate.
const firstCharacter = (text: string) => Array.from(text)[0];

/**
 * An e-mail as a lecteur sees it in the registre des comptes inscrits: the first character of the
 * name, then of the domain, each followed by "•••", and the domain's last label ("l•••@e•••.com").
 * Fixed length: the mask never tells how long the name or the domain is.
 */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  const domain = email.slice(at + 1);
  const dot = domain.lastIndexOf(".");
  const lastLabel = dot === -1 ? "" : domain.slice(dot);

  return `${firstCharacter(email.slice(0, at))}•••@${firstCharacter(domain)}•••${lastLabel}`;
}
