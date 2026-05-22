import type { NextConfig } from "next";

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
};

export default nextConfig;
