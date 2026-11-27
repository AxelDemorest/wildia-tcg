import { describe, expect, it } from "vitest";
import { BIO_MAX, DISPLAY_NAME_MAX, parseProfileForm } from "@/lib/profiles/profile-form";

const CARD_A = "0b3a6f1e-2c4d-4e5f-8a9b-1c2d3e4f5a6b";
const CARD_B = "1b4b7f2e-3d5e-4f6a-9b0c-2d3e4f5a6b7c";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

function emptyShowcaseFields(): Record<string, string> {
  return Object.fromEntries(
    Array.from({ length: 6 }, (_, index) => [`showcaseSlot${index + 1}`, ""]),
  );
}

describe("parseProfileForm", () => {
  it("reads a filled form with showcase slots", () => {
    expect(
      parseProfileForm(
        form({
          displayName: "Nohan",
          bio: "Fan de loutres",
          isPublic: "true",
          ...emptyShowcaseFields(),
          showcaseSlot1: CARD_A,
          showcaseSlot3: CARD_B,
        }),
      ),
    ).toEqual({
      displayName: "Nohan",
      bio: "Fan de loutres",
      isPublic: true,
      showcaseSlots: [CARD_A, null, CARD_B, null, null, null],
    });
  });

  it("turns blank or missing fields into null, and anything but true into private", () => {
    expect(
      parseProfileForm(
        form({
          displayName: "   ",
          bio: "",
          ...emptyShowcaseFields(),
        }),
      ),
    ).toEqual({
      displayName: null,
      bio: null,
      isPublic: false,
      showcaseSlots: Array.from({ length: 6 }, () => null),
    });
  });

  it("trims the display name and the bio before checking their length", () => {
    const name = "x".repeat(DISPLAY_NAME_MAX);
    expect(
      parseProfileForm(form({ displayName: `  ${name}  `, ...emptyShowcaseFields() }))?.displayName,
    ).toBe(name);
  });

  it("refuses a display name or a bio over the limit", () => {
    expect(
      parseProfileForm(form({ displayName: "x".repeat(DISPLAY_NAME_MAX + 1), ...emptyShowcaseFields() })),
    ).toBeNull();
    expect(parseProfileForm(form({ bio: "x".repeat(BIO_MAX + 1), ...emptyShowcaseFields() }))).toBeNull();
  });

  it("refuses an invalid showcase card id or duplicate slots", () => {
    expect(
      parseProfileForm(
        form({
          ...emptyShowcaseFields(),
          showcaseSlot2: "not-a-uuid",
        }),
      ),
    ).toBeNull();
    expect(
      parseProfileForm(
        form({
          ...emptyShowcaseFields(),
          showcaseSlot1: CARD_A,
          showcaseSlot6: CARD_A,
        }),
      ),
    ).toBeNull();
  });
});