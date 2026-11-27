"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { ResendConfirmationForm } from "@/components/resend-confirmation-form";
import type { AuthActionState } from "@/server/actions/auth";

type Props = {
  locale: string;
  mode: "login" | "signup";
  action: (locale: string, prev: AuthActionState, formData: FormData) => Promise<AuthActionState>;
  /** Where the action sends the user once signed in; the action sanitizes it again. */
  returnTo?: string;
};

export function AuthForm({ locale, mode, action, returnTo }: Props) {
  const t = useTranslations("Auth");
  const boundAction = (prev: AuthActionState, formData: FormData) => action(locale, prev, formData);
  const [state, formAction, pending] = useActionState(boundAction, {});

  // Supabase's own messages (weak password, …) are shown as they come.
  function errorText(error: string): string {
    if (error === "rate_limited") return t("errorRateLimited");
    if (error === "failed") return t("errorSignUpFailed");
    if (error === "email_not_confirmed") return t("errorEmailNotConfirmed");
    return error;
  }

  if (state.checkEmail) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-white/85" role="status">
          {t("checkEmail", { email: state.checkEmail.email })}
        </p>
        <ResendConfirmationForm
          locale={locale}
          email={state.checkEmail.email}
          returnTo={returnTo}
          accountId={state.checkEmail.accountId}
        />
      </div>
    );
  }

  return (
    <>
      <form action={formAction} className="flex flex-col gap-4">
        {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
        <label className="flex flex-col gap-1.5 text-sm font-medium text-white/85">
          {t("email")}
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="rounded-md border border-border bg-background px-3 py-2.5 text-white placeholder:text-muted focus:border-brand/60 focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-white/85">
          {t("password")}
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className="rounded-md border border-border bg-background px-3 py-2.5 text-white placeholder:text-muted focus:border-brand/60 focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </label>
        {state.error && (
          <p className="text-sm text-red-300" role="alert">
            {errorText(state.error)}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="mt-1 rounded-md bg-brand px-4 py-2.5 font-semibold text-white transition hover:bg-brand-strong disabled:opacity-60"
        >
          {mode === "login" ? t("submitLogin") : t("submitSignup")}
        </button>
      </form>
      {state.unconfirmedEmail && (
        <ResendConfirmationForm
          locale={locale}
          email={state.unconfirmedEmail}
          returnTo={returnTo}
        />
      )}
    </>
  );
}
