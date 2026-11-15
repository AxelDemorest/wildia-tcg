import { describe, expect, it } from "vitest";
import { BIO_MAX, DISPLAY_NAME_MAX, parseProfileForm } from "@/lib/profiles/profile-form";

const CARD_ID = "0b3a6f1e-2c4d-4e5f-8a9b-1c2d3e4f5a6b";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

describe("parseProfileForm", () => {
  it("reads a filled form", () => {
    expect(
      parseProfileForm(
        form({
          displayName: "Nohan",
          bio: "Fan de loutres",
          isPublic: "true",
          featuredCardId: CARD_ID,
        }),
      ),
    ).toEqual({
      displayName: "Nohan",
      bio: "Fan de loutres",
      isPublic: true,
      featuredCardId: CARD_ID,
    });
  });

  it("turns blank or missing fields into null, and anything but true into private", () => {
    expect(parseProfileForm(form({ displayName: "   ", bio: "", featuredCardId: "" }))).toEqual({
      displayName: null,
      bio: null,
      isPublic: false,
      featuredCardId: null,
    });
    expect(parseProfileForm(form({}))).toEqual({
      displayName: null,
      bio: null,
      isPublic: false,
      featuredCardId: null,
    });
  });

  it("trims the display name and the bio before checking their length", () => {
    const name = "x".repeat(DISPLAY_NAME_MAX);
    expect(parseProfileForm(form({ displayName: `  ${name}  ` }))?.displayName).toBe(name);
  });

  it("refuses a display name or a bio over the limit", () => {
    expect(parseProfileForm(form({ displayName: "x".repeat(DISPLAY_NAME_MAX + 1) }))).toBeNull();
    expect(parseProfileForm(form({ bio: "x".repeat(BIO_MAX + 1) }))).toBeNull();
  });

  it("refuses a featured card that is not a card id", () => {
    expect(parseProfileForm(form({ featuredCardId: "not-a-uuid" }))).toBeNull();
  });
});
