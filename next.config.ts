import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the file-tracing root to this project directory. Without this, a clean
  // install on Vercel can misdetect a workspace root during "Finalizing page
  // optimization" and pass an undefined path to `next build` (ERR_INVALID_ARG_TYPE).
  outputFileTracingRoot: path.resolve(__dirname),
};

export default nextConfig;
