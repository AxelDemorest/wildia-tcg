import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { knownLocaleOrDefault } from "@/lib/auth/return-to";
import { completeEmailConfirm } from "@/server/auth/email-confirm";

type Props = { params: Promise<{ locale: string }> };

export async function GET(request: NextRequest, { params }: Props) {
  const locale = knownLocaleOrDefault((await params).locale);
  const { searchParams } = request.nextUrl;
  const to = await completeEmailConfirm({
    locale,
    tokenHash: searchParams.get("token_hash"),
    returnTo: searchParams.get("returnTo"),
  });
  redirect(to);
}
