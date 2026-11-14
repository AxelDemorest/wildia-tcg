import { describe, expect, it } from "vitest";
import { grantCardInputSchema } from "@/lib/inventory/grant-card-schema";

describe("grantCardInputSchema", () => {
  it("accepts valid input", () => {
    const result = grantCardInputSchema.parse({
      userId: "11111111-1111-4111-8111-111111111111",
      cardId: "22222222-2222-4222-8222-222222222222",
      quantity: 2,
      source: "dev_grant",
    });
    expect(result.quantity).toBe(2);
  });

  it("rejects invalid quantity", () => {
    expect(() =>
      grantCardInputSchema.parse({
        userId: "11111111-1111-4111-8111-111111111111",
        cardId: "22222222-2222-4222-8222-222222222222",
        quantity: 0,
      }),
    ).toThrow();
  });
});
