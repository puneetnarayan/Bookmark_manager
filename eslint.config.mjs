import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // These React Compiler-oriented rules flag the standard "reset local form/UI
      // state when a modal opens or a prop id changes" and "fetch on mount" effect
      // patterns used throughout this app's modals and settings panels. They're
      // useful signals but not correctness bugs here, so they're warnings, not
      // build-breaking errors.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // The browser extension is a separate, plain-JS (non-module, chrome.* global) codebase
    // with its own conventions — not part of the Next.js app this config targets.
    "extension/**",
  ]),
]);

export default eslintConfig;
