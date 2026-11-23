import { describe, expect, it } from "vitest";
import { maskEmail } from "@/lib/admin/mask-email";

// The contract under test (slice 2):
//   maskEmail(email: string): string
//   First character of the local part, "•••", "@", first character of the domain, "•••", then
//   the last label of the domain behind a dot when the domain has one. Always the same length,
//   whatever the address.

describe("maskEmail", () => {
  it.each([
    ["lea.martin@example.com", "l•••@e•••.com"],
    ["l@e.com", "l•••@e•••.com"],
    ["a@mail.example.co.uk", "a•••@m•••.uk"],
    ["x@localhost", "x•••@l•••"],
    ["🦊@x.io", "🦊•••@x•••.io"],
  ])("masks %s as %s", (email, masked) => {
    expect(maskEmail(email)).toBe(masked);
  });
});
