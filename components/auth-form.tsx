"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import type { AuthActionState } from "@/server/actions/auth";

type Props = {
  locale: string;
  mode: "login" | "signup";
  action: (
    locale: string,
    prev: AuthActionState,
    formData: FormData,
  ) => Promise<AuthActionState>;
};

export function AuthForm({ locale, mode, action }: Props) {
  const t = useTranslations("Auth");
  const boundAction = (prev: AuthActionState, formData: FormData) =>
    action(locale, prev, formData);
  const [state, formAction, pending] = useActionState(boundAction, {});

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      <h1 className="text-2xl font-semibold">
        {mode === "login" ? t("loginTitle") : t("signupTitle")}
      </h1>
      <label className="flex flex-col gap-1 text-sm">
        {t("email")}
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        {t("password")}
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </label>
      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error === "rate_limited" ? t("errorRateLimited") : state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-emerald-600 px-4 py-2 font-medium text-white disabled:opacity-60"
      >
        {mode === "login" ? t("submitLogin") : t("submitSignup")}
      </button>
    </form>
  );
}
