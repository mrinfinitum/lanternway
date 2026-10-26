import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * Content-Security-Policy: everything from our own origin only. Auth goes through
 * our /api/auth proxy and the database is only reached from the server, so the
 * browser never needs another origin. Next.js needs inline scripts for its
 * streamed pages; local development also needs eval for fast refresh.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self'${isDev ? " ws: http://localhost:*" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
];

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  async headers() {
    // Keep everything except production (e.g. dev.lanternway.co) out of search engines.
    const noindex = process.env.VERCEL_ENV === "production" ? [] : [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];
    return [{ source: "/:path*", headers: [...securityHeaders, ...noindex] }];
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

export default nextConfig;
