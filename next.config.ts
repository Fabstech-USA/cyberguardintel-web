import type { NextConfig } from "next";

const securityHeaders = [
  // Two years, subdomains included; safe because the app is HTTPS-only in prod.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // pdf-parse/pdfjs-dist load a worker file from disk; bundling breaks that path.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "mammoth"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
