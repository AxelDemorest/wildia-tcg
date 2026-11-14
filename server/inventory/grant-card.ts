import "server-only";

import { createServiceClient } from "@/lib/supabase/admin";
import {
  grantCardInputSchema,
  type GrantCardInput,
} from "@/lib/inventory/grant-card-schema";

export { grantCardInputSchema, type GrantCardInput };

export async function grantCardToUser(input: GrantCardInput): Promise<void> {
  const parsed = grantCardInputSchema.parse(input);
  const supabase = createServiceClient();

  const { error } = await supabase.rpc("grant_card", {
    p_user_id: parsed.userId,
    p_card_id: parsed.cardId,
    p_quantity: parsed.quantity,
    p_source: parsed.source,
  });

  if (error) {
    throw new Error(error.message);
  }
}
