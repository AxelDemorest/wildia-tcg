/** The messages the boutique boosters shows when it is reached in place of a révélation. */
export const SHOP_NOTICES = ["already-opened", "load-failed"] as const;

export type ShopNotice = (typeof SHOP_NOTICES)[number];

/** The notice named by the shop's `?notice=` value; a missing or unknown value shows nothing. */
export function parseShopNotice(value: string | null): ShopNotice | null {
  return SHOP_NOTICES.find((notice) => notice === value) ?? null;
}

/** The boutique boosters showing this notice: where the révélation sends the player instead. */
export function shopNoticeHref(locale: string, notice: ShopNotice): string {
  return `/${locale}/boosters?notice=${notice}`;
}
