"use server";

import { enterContest } from "@/server/contest/enter-contest";
import { assertContestRateLimit } from "@/server/rate-limit/enforce";

export type ContestActionState = {
  status: "idle" | "success" | "error";
  error?: "invalid" | "rate_limited" | "failed";
};

export async function enterContestAction(
  _prev: ContestActionState,
  formData: FormData,
): Promise<ContestActionState> {
  // Honeypot: real users never fill this hidden field.
  if (String(formData.get("website") ?? "") !== "") {
    return { status: "success" };
  }

  if (!(await assertContestRateLimit())) {
    return { status: "error", error: "rate_limited" };
  }

  const result = await enterContest(formData.get("email"));
  if (!result.ok) {
    return { status: "error", error: result.error };
  }
  return { status: "success" };
}
