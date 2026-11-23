import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { AuthForm } from "@/components/auth-form";
import { safeReturnTo } from "@/lib/auth/return-to";
import { signIn } from "@/server/actions/auth";
import { getUser } from "@/server/auth/require-user";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
};

export const dynamic = "force-dynamic";

export default async function LoginPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const returnTo = safeReturnTo((await searchParams).returnTo, locale);
  const user = await getUser();
  if (user) {
    redirect(returnTo);
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <AuthForm locale={locale} mode="login" action={signIn} returnTo={returnTo} />
    </div>
  );
}
