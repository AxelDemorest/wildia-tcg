"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { resendConfirmation, type AuthActionState } from "@/server/actions/auth";

type Props = {
  locale: string;
  email: string;
  /** Where the new link leads; the action sanitizes it. */
  returnTo?: string;
  /** The account the sign-up created, so the resend cannot reach another one. */
  accountId?: string;
};

/** Asks for the confirmation link again; says the same whatever became of the address. */
export function ResendConfirmationForm({ locale, email, returnTo, accountId }: Props) {
  const t = useTranslations("Auth");
  const [state, formAction, pending] = useActionState(
    (prev: AuthActionState, formData: FormData) => resendConfirmation(locale, prev, formData),
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="email" value={email} />
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
      {accountId && <input type="hidden" name="accountId" value={accountId} />}
      {state.resent && (
        <p className="text-sm text-white/85" role="status">
          {t("resentLink")}
        </p>
      )}
      {state.error && (
        <p className="text-sm text-red-300" role="alert">
          {state.error === "rate_limited" ? t("errorRateLimited") : t("resendFailed")}
        </p>
      )}
      <p className="text-sm text-muted">{t("nothingReceived")}</p>
      <button
        type="submit"
        disabled={pending}
        className="self-start text-sm font-semibold text-brand hover:underline disabled:opacity-60"
      >
        {t("resendLink")}
      </button>
    </form>
  );
}
