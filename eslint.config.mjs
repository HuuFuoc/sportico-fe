import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Stylistic — quotes/apostrophes inside JSX text are fine.
      "react/no-unescaped-entities": "off",
      // The `useEffect → setMounted(true)` pattern is the standard idiom for
      // client-only rendering (e.g. RoleSwitcher in dev mode, ClientOnly
      // wrapper for chart libraries that read DOM dimensions).
      "react-hooks/set-state-in-effect": "off",
      // Mock data uses external avatar URLs (pravatar/placehold). Switching
      // to next/image requires remote-pattern config and gives no real win
      // for placeholder images.
      "@next/next/no-img-element": "off",
    },
  },
]);

export default eslintConfig;
