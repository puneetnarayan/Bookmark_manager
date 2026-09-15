import { defineConfig } from "vitest/config";
import path from "node:path";

const rootDir = import.meta.dirname;

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "server-only": path.resolve(rootDir, "tests/mocks/server-only-stub.ts"),
      "@": path.resolve(rootDir, "."),
    },
  },
});
