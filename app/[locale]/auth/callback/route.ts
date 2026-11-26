import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { knownLocaleOrDefault } from "@/lib/auth/return-to";
import { completeOAuthSignIn } from "@/server/auth/oauth-callback";

type Props = { params: Promise<{ locale: string }> };

export async function GET(request: NextRequest, { params }: Props) {
  const locale = knownLocaleOrDefault((await params).locale);
  const { searchParams } = request.nextUrl;
  const to = await completeOAuthSignIn({
    locale,
    code: searchParams.get("code"),
    returnTo: searchParams.get("returnTo"),
    error: searchParams.get("error"),
    errorCode: searchParams.get("error_code"),
    errorDescription: searchParams.get("error_description"),
  });
  redirect(to);
}
