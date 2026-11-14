import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { AuthForm } from "@/components/auth-form";
import { signIn } from "@/server/actions/auth";
import { getUser } from "@/server/auth/require-user";

type Props = { params: Promise<{ locale: string }> };

export const dynamic = "force-dynamic";

export default async function LoginPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getUser();
  if (user) {
    redirect(`/${locale}`);
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <AuthForm locale={locale} mode="login" action={signIn} />
    </div>
  );
}
