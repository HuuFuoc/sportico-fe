import { defineConfig } from "vitest/config";
import path from "node:path";

// Minimal config: pure-function unit tests only (no jsdom/DOM needed yet).
// Mirrors the `@/*` alias from tsconfig.json so test files can import the
// same way application code does.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
