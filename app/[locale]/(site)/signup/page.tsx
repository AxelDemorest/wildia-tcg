import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { AuthCard } from "@/components/auth-card";
import { safeReturnTo } from "@/lib/auth/return-to";
import { signInWithProvider, signUp } from "@/server/actions/auth";
import { getUser } from "@/server/auth/require-user";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
};

export const dynamic = "force-dynamic";

export default async function SignupPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const returnTo = safeReturnTo((await searchParams).returnTo, locale);
  const user = await getUser();
  if (user) {
    redirect(returnTo);
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <AuthCard
        locale={locale}
        mode="signup"
        emailAction={signUp}
        oauthAction={signInWithProvider}
        returnTo={returnTo}
      />
    </div>
  );
}
