import { useTranslations } from "next-intl";
import { AuthForm } from "@/components/auth-form";
import { OAuthSignInForm } from "@/components/oauth-sign-in-form";
import { Surface } from "@/components/ui/surface";
import { Link } from "@/i18n/navigation";
import type { OAuthErrorCode } from "@/lib/auth/oauth-error";
import type { AuthActionState } from "@/server/actions/auth";

type Action = (
  locale: string,
  prev: AuthActionState,
  formData: FormData,
) => Promise<AuthActionState>;

type Props = {
  locale: string;
  mode: "login" | "signup";
  emailAction: Action;
  oauthAction: Action;
  /** Where to come back to once signed in, an internal path (`safeReturnTo`). */
  returnTo: string;
  /** What went wrong with a provider sign-in, shown above the OAuth buttons. */
  oauthError?: OAuthErrorCode | null;
};

/** The sign-in screen of both pages: OAuth on top, a separator, the e-mail form, the other page. */
export function AuthCard({ locale, mode, emailAction, oauthAction, returnTo, oauthError }: Props) {
  const t = useTranslations("Auth");
  // The home is the pages' own fallback: no need to carry it.
  const query = returnTo === `/${locale}` ? undefined : { returnTo };

  return (
    <Surface className="relative isolate flex w-full max-w-sm flex-col gap-4 overflow-hidden p-6 sm:p-8">
      <div
        aria-hidden
        className="absolute -right-16 -top-20 -z-10 size-56 rounded-full bg-brand/15 blur-3xl"
      />
      <h1 className="text-2xl font-extrabold uppercase tracking-tight">
        {mode === "login" ? t("loginTitle") : t("signupTitle")}
      </h1>
      {oauthError && (
        <p className="text-sm text-red-300" role="alert">
          {t(`oauthError.${oauthError}`)}
        </p>
      )}
      <OAuthSignInForm locale={locale} action={oauthAction} returnTo={returnTo} />
      <div className="flex items-center gap-3 text-xs uppercase text-muted before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
        <span>{t("separator")}</span>
      </div>
      <AuthForm locale={locale} mode={mode} action={emailAction} returnTo={returnTo} />
      <p className="text-center text-sm text-muted">
        {mode === "login" ? t("noAccount") : t("haveAccount")}{" "}
        <Link
          href={{ pathname: mode === "login" ? "/signup" : "/login", query }}
          className="font-semibold text-brand hover:underline"
        >
          {mode === "login" ? t("createAccount") : t("logIn")}
        </Link>
      </p>
    </Surface>
  );
}
