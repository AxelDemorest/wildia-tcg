// The ouverture the shop just made in this tab, kept in memory only: a refresh, a direct link or a
// new tab starts without it, so the révélation is not replayed. It is per-browser-tab state: never
// set it on the server, where this module is a single variable shared by every request.
let pendingDrawId: string | null = null;

/** Set by the shop right before it navigates to the révélation of this draw. */
export function markPendingReveal(drawId: string): void {
  pendingDrawId = drawId;
}

/** Whether the shop just opened this draw in this tab; reading it does not use it up. */
export function isRevealPending(drawId: string): boolean {
  return pendingDrawId === drawId;
}

/** Uses up the marker of this draw, so coming back to its révélation (Forward) does not replay it. */
export function consumePendingReveal(drawId: string): void {
  if (pendingDrawId === drawId) pendingDrawId = null;
}
