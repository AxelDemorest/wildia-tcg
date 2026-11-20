"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isDevGrantsEnabled } from "@/lib/env";
import { grantCardToUser } from "@/server/inventory/grant-card";
import { requireUser } from "@/server/auth/require-user";

const devGrantSchema = z.object({
  locale: z.string(),
  cardId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).max(99).optional(),
});

export type DevGrantState = { ok: boolean; message?: string };

export async function devGrantCard(
  _prev: DevGrantState,
  formData: FormData,
): Promise<DevGrantState> {
  if (!isDevGrantsEnabled()) {
    return { ok: false, message: "disabled" };
  }

  const parsed = devGrantSchema.safeParse({
    locale: formData.get("locale"),
    cardId: formData.get("cardId"),
    quantity: formData.get("quantity") || 1,
  });

  if (!parsed.success) {
    return { ok: false, message: "invalid" };
  }

  const { locale, cardId, quantity = 1 } = parsed.data;
  const user = await requireUser(locale);

  try {
    await grantCardToUser({
      userId: user.id,
      cardId,
      quantity,
      source: "dev_grant",
    });
  } catch {
    return { ok: false, message: "failed" };
  }

  revalidatePath(`/${locale}/players/${user.id}/collection`);
  return { ok: true };
}
