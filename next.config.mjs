import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverActions: {
    // NEXT_PUBLIC_APP_URL = production domain (set manually in Vercel project settings)
    // VERCEL_URL = auto-set by Vercel for every deployment (preview + production)
    allowedOrigins: [
      "localhost:3000",
      ...(process.env.NEXT_PUBLIC_APP_URL ? [process.env.NEXT_PUBLIC_APP_URL] : []),
      ...(process.env.VERCEL_URL ? [process.env.VERCEL_URL] : []),
    ],
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        // Restrict to own Supabase project instead of wildcard *.supabase.co
        hostname: process.env.NEXT_PUBLIC_SUPABASE_URL
          ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
          : "*.supabase.co",
      },
    ],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://unpkg.com",
              "style-src 'self' 'unsafe-inline' https://unpkg.com",
              `img-src 'self' data: blob: https://*.supabase.co https://*.tile.openstreetmap.org https://unpkg.com https://openwms.statkart.no`,
              `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://nominatim.openstreetmap.org https://*.tile.openstreetmap.org`,
              "font-src 'self'",
              "frame-ancestors 'none'",
              "frame-src 'self' blob:",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
