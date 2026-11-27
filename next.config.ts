import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { AVATAR_REMOTE_PATTERNS } from "./lib/profiles/avatar-hosts";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// Local Supabase (`npx supabase start`) serves card art from 127.0.0.1, which next/image
// rejects unless the host is listed and local IPs are allowed. Only applies to that URL.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
const isLocalSupabase = /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(supabaseUrl);

const nextConfig: NextConfig = {
  experimental: {
    agentUpgrade: "security",
  },
  // Local Supabase and some bookmarks use 127.0.0.1 while `next dev` binds as localhost.
  // Without this, Server Actions (login, etc.) silently no-op from 127.0.0.1.
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    remotePatterns: [
      ...AVATAR_REMOTE_PATTERNS,
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/card-art/**",
      },
      ...(isLocalSupabase ? [new URL(`${supabaseUrl}/storage/v1/object/public/card-art/**`)] : []),
    ],
    dangerouslyAllowLocalIP: isLocalSupabase,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);
