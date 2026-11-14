import { z } from "zod";

export const grantCardInputSchema = z.object({
  userId: z.string().uuid(),
  cardId: z.string().uuid(),
  quantity: z.number().int().min(1).max(99).default(1),
  source: z.string().min(1).max(64).default("grant"),
});

export type GrantCardInput = z.infer<typeof grantCardInputSchema>;
