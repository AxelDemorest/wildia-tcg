"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import type { AuthActionState } from "@/server/actions/auth";

type Props = {
  locale: string;
  action: (locale: string, prev: AuthActionState, formData: FormData) => Promise<AuthActionState>;
  /** Where to come back to once signed in; the action sanitizes it again. */
  returnTo?: string;
};

export function GoogleSignInForm({ locale, action, returnTo }: Props) {
  const t = useTranslations("Auth");
  const boundAction = (prev: AuthActionState, formData: FormData) => action(locale, prev, formData);
  const [state, formAction, pending] = useActionState(boundAction, {});

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-2">
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
      {state.error && (
        <p className="text-sm text-red-300" role="alert">
          {state.error === "rate_limited" ? t("errorRateLimited") : t("errorGeneric")}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl border border-border bg-surface/80 px-4 py-2.5 font-semibold text-white transition hover:bg-surface disabled:opacity-60"
      >
        {t("continueWithGoogle")}
      </button>
    </form>
  );
}
