import { setRequestLocale } from "next-intl/server";
import { AdminShell } from "@/components/admin/admin-shell";
import { getStaffSession } from "@/server/auth/require-staff";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function AdminLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  // No redirect here: each page redirects through requireStaff. Only a membre équipe gets the
  // shell, so nothing of the espace administration is ever rendered for anyone else.
  const session = await getStaffSession(locale);
  if (!session) return children;

  return (
    <AdminShell locale={locale} session={session}>
      {children}
    </AdminShell>
  );
}
