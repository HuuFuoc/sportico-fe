import type { NextConfig } from "next";

// Backend origin proxied to avoid CORS. The browser only ever calls the
// same-origin `/api-proxy/*`; Next forwards it server-side to this host (works
// in dev and in production on Vercel). Override via BACKEND_ORIGIN if needed.
const BACKEND_ORIGIN =
  process.env.BACKEND_ORIGIN ??
  "https://sportico-api-khoi-g3bpg4a3dnhehng8.japaneast-01.azurewebsites.net";

const nextConfig: NextConfig = {
  // Pin the file-tracing root to this project directory. Without this, a clean
  // install on Vercel can misdetect a workspace root during "Finalizing page
  // optimization" and pass an undefined path to `next build` (ERR_INVALID_ARG_TYPE).
  //
  // Use process.cwd() rather than __dirname: __dirname is a CommonJS-only global
  // and resolves to undefined when Next.js loads this config as an ES module on
  // Vercel, which itself triggers ERR_INVALID_ARG_TYPE. During `next build`,
  // process.cwd() is always the project root.
  outputFileTracingRoot: process.cwd(),

  // Same-origin proxy → no CORS. `src/lib/api-client.ts` prefixes requests with
  // NEXT_PUBLIC_API_BASE_URL=/api-proxy, so `/api-proxy/api/auth/login` is
  // rewritten to `<backend>/api/auth/login`. Request headers (Bearer token,
  // Content-Type) are forwarded by the rewrite.
  async rewrites() {
    return [
      {
        source: "/api-proxy/:path*",
        destination: `${BACKEND_ORIGIN}/:path*`,
      },
    ];
  },
};

export default nextConfig;
