import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthForm } from "@/components/auth-form";
import { GoogleSignInForm } from "@/components/google-sign-in-form";
import { parseOAuthError } from "@/lib/auth/oauth-error";
import { safeReturnTo } from "@/lib/auth/return-to";
import { signIn, signInWithGoogle } from "@/server/actions/auth";
import { getUser } from "@/server/auth/require-user";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ returnTo?: string | string[]; error?: string | string[] }>;
};

export const dynamic = "force-dynamic";

export default async function LoginPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { returnTo: rawReturnTo, error } = await searchParams;
  const returnTo = safeReturnTo(rawReturnTo, locale);
  const user = await getUser();
  if (user) {
    redirect(returnTo);
  }

  const oauthError = parseOAuthError(typeof error === "string" ? error : null);
  const t = await getTranslations("Auth");

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="flex w-full max-w-sm flex-col gap-4">
        {oauthError && (
          <p className="text-sm text-red-300" role="alert">
            {t(`oauthError.${oauthError}`)}
          </p>
        )}
        <AuthForm locale={locale} mode="login" action={signIn} returnTo={returnTo} />
        <GoogleSignInForm locale={locale} action={signInWithGoogle} returnTo={returnTo} />
      </div>
    </div>
  );
}
