import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { AuthCard } from "@/components/auth-card";
import { parseOAuthError } from "@/lib/auth/oauth-error";
import { safeReturnTo } from "@/lib/auth/return-to";
import { signIn, signInWithProvider } from "@/server/actions/auth";
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

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <AuthCard
        locale={locale}
        mode="login"
        emailAction={signIn}
        oauthAction={signInWithProvider}
        returnTo={returnTo}
        oauthError={parseOAuthError(typeof error === "string" ? error : null)}
      />
    </div>
  );
}
