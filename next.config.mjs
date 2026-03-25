/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // Include production domain via env var (set NEXT_PUBLIC_APP_URL in Vercel/hosting)
      allowedOrigins: process.env.NEXT_PUBLIC_APP_URL
        ? [process.env.NEXT_PUBLIC_APP_URL, "localhost:3000"]
        : ["localhost:3000"],
    },
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
          // Prevent clickjacking
          { key: "X-Frame-Options", value: "DENY" },
          // Prevent MIME-type sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Force HTTPS for 1 year (Vercel handles TLS termination)
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          // Limit referrer information
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Disable unnecessary browser features
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
          // Content Security Policy
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Next.js inline scripts + Vercel Speed Insights + Leaflet via unpkg
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://unpkg.com",
              "style-src 'self' 'unsafe-inline' https://unpkg.com",
              // Supabase storage for images/attachments + OpenStreetMap tiles for map picker
              `img-src 'self' data: blob: https://*.supabase.co https://*.tile.openstreetmap.org https://unpkg.com`,
              // Supabase API + own API + Nominatim geocoding for map picker
              `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://nominatim.openstreetmap.org`,
              "font-src 'self'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
