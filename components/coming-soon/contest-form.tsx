"use client";

import { useActionState, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { parseContestEmail } from "@/lib/contest/entry-schema";
import { enterContestAction, type ContestActionState } from "@/server/actions/contest";

const INITIAL_STATE: ContestActionState = { status: "idle" };

export function ContestForm() {
  const t = useTranslations("ComingSoon");
  const [state, formAction, pending] = useActionState(enterContestAction, INITIAL_STATE);
  const [clientError, setClientError] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const email = new FormData(event.currentTarget).get("email");
    if (parseContestEmail(email) === null) {
      event.preventDefault();
      setClientError(true);
      return;
    }
    setClientError(false);
  }

  if (state.status === "success") {
    return (
      <p
        role="status"
        className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-medium text-white ring-1 ring-white/20"
      >
        {t("contestSuccess")}
      </p>
    );
  }

  const errorKey = clientError
    ? "invalid"
    : state.status === "error"
      ? (state.error ?? "failed")
      : null;

  const errorMessage =
    errorKey === "invalid"
      ? t("contestErrorInvalid")
      : errorKey === "rate_limited"
        ? t("contestErrorRateLimited")
        : errorKey === "failed"
          ? t("contestErrorFailed")
          : null;

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="w-full">
      <label htmlFor="contest-email" className="sr-only">
        {t("contestEmailLabel")}
      </label>
      <div className="flex w-full items-center gap-1.5 rounded-xl bg-[#16161b] p-1.5 ring-1 ring-white/10 focus-within:ring-2 focus-within:ring-brand">
        <input
          id="contest-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          maxLength={254}
          placeholder={t("contestEmailPlaceholder")}
          aria-invalid={errorKey === "invalid"}
          aria-describedby={errorMessage ? "contest-error" : undefined}
          onChange={() => clientError && setClientError(false)}
          className="min-w-0 flex-1 bg-transparent px-4 py-2 text-sm text-foreground placeholder:text-muted/70 focus:outline-none"
        />
        {/* Honeypot, hidden from users and assistive tech. */}
        <input
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
          className="absolute -left-[9999px] h-0 w-0 opacity-0"
        />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-strong disabled:opacity-60"
        >
          {pending ? t("contestSubmitting") : t("contestSubmit")}
        </button>
      </div>

      {errorMessage ? (
        <p id="contest-error" role="alert" className="mt-2 px-4 text-xs font-medium text-red-300">
          {errorMessage}
        </p>
      ) : null}
    </form>
  );
}
