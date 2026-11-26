"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { DiscordIcon, GoogleIcon } from "@/components/ui/brand-icons";
import type { AuthActionState } from "@/server/actions/auth";

type Props = {
  locale: string;
  action: (locale: string, prev: AuthActionState, formData: FormData) => Promise<AuthActionState>;
  /** Where to come back to once signed in; the action sanitizes it again. */
  returnTo?: string;
};

const ICON_CLASS = "mr-2 size-5 shrink-0";

export function OAuthSignInForm({ locale, action, returnTo }: Props) {
  const t = useTranslations("Auth");
  const boundAction = (prev: AuthActionState, formData: FormData) => action(locale, prev, formData);
  const [state, formAction, pending] = useActionState(boundAction, {});

  return (
    <form action={formAction} className="flex flex-col gap-2">
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
      {state.error && (
        <p className="text-sm text-red-300" role="alert">
          {state.error === "rate_limited" ? t("errorRateLimited") : t("oauthError.failed")}
        </p>
      )}
      {/* The clicked button's value is the provider; the action checks it. */}
      <Button
        type="submit"
        variant="secondary"
        name="provider"
        value="google"
        disabled={pending}
        className="py-2.5"
      >
        <GoogleIcon className={ICON_CLASS} />
        {t("continueWithGoogle")}
      </Button>
      <Button
        type="submit"
        variant="secondary"
        name="provider"
        value="discord"
        disabled={pending}
        className="py-2.5"
      >
        <DiscordIcon className={ICON_CLASS} />
        {t("continueWithDiscord")}
      </Button>
    </form>
  );
}
