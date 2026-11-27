import "server-only";

import { unknownAccountOf, type CoinGrant } from "@/lib/admin/grant-coins";
import { createServiceClient } from "@/lib/supabase/admin";

/**
 * Credits an account with an admin_adjust ledger row and keeps the grant, in one transaction
 * (admin_grant_coins, executable by the service role only). Called by runGrantCoins once the
 * session is checked. A failure is logged here before it is thrown, except an account that no longer
 * exists: that refusal, `unknown_account`, is thrown as is.
 */
export async function writeCoinGrant({
  userId,
  amount,
  reason,
  authorId,
}: CoinGrant): Promise<void> {
  try {
    const { error } = await createServiceClient().rpc("admin_grant_coins", {
      p_user_id: userId,
      p_amount: amount,
      p_author_id: authorId,
      p_reason: reason,
    });
    if (error) throw new Error(error.message);
  } catch (error) {
    if (unknownAccountOf(error) !== null) throw error;
    console.error(`Admin coins: granting coins to the account ${userId} failed.`, error);
    throw error;
  }
}
