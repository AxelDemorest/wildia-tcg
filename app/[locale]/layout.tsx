import { Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { googleSansFlex } from "@/app/fonts/google-sans-flex";
import { lexend } from "@/app/fonts/lexend";
import "../globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const messages = await getMessages();
  // The espace administration's labels are rendered on the server only: no page sends them to the
  // browser, so nothing hints at the admin to anyone but a membre équipe.
  const clientMessages = Object.fromEntries(
    Object.entries(messages).filter(([namespace]) => namespace !== "Admin"),
  );

  return (
    <html
      lang={locale}
      className={`${lexend.variable} ${googleSansFlex.variable} ${geistMono.variable} h-full bg-background antialiased`}
    >
      <body className="relative flex min-h-full flex-col bg-background text-foreground">
        <NextIntlClientProvider messages={clientMessages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
