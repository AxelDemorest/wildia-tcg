import { beforeAll, describe, expect, it } from "vitest";

// The contract under test (the plan names the module, not the functions):
//   formatAdminDate(iso: string, locale: "fr" | "en"): string      fr "21 nov. 2026", en "Nov 21, 2026"
//   formatAdminDateTime(iso: string, locale: "fr" | "en"): string  fr "21 nov. 2026, 14:32", en "Nov 21, 2026, 2:32 PM"
//   Always in Europe/Paris, whatever the machine's time zone.

let formatAdminDate: (iso: string, locale: "fr" | "en") => string;
let formatAdminDateTime: (iso: string, locale: "fr" | "en") => string;

// The machine runs in UTC, so a formatter that forgets the time zone gets the hour wrong.
beforeAll(async () => {
  process.env.TZ = "UTC";
  ({ formatAdminDate, formatAdminDateTime } = await import("@/lib/admin/admin-dates"));
});

// ICU may put a narrow no-break space before "PM": same text for the reader.
const plain = (text: string) => text.replace(/[  ]/g, " ");

describe("admin dates, in Europe/Paris", () => {
  it("writes a French date", () => {
    expect(plain(formatAdminDate("2026-11-21T13:32:00Z", "fr"))).toBe("21 nov. 2026");
  });

  it("writes a French date and time, one hour ahead of UTC in November", () => {
    expect(plain(formatAdminDateTime("2026-11-21T13:32:00Z", "fr"))).toBe("21 nov. 2026, 14:32");
  });

  it("dates a late evening in UTC on the next day in Paris", () => {
    expect(plain(formatAdminDate("2026-11-20T23:30:00Z", "fr"))).toBe("21 nov. 2026");
  });

  it("writes an English date", () => {
    expect(plain(formatAdminDate("2026-11-21T13:32:00Z", "en"))).toBe("Nov 21, 2026");
  });

  it("writes an English date and time on 12 hours", () => {
    expect(plain(formatAdminDateTime("2026-11-21T13:32:00Z", "en"))).toBe("Nov 21, 2026, 2:32 PM");
  });
});
