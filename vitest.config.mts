import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    // Mirror the tsconfig `@/*` path alias so tests can import app modules by alias.
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    // Unit tests only; Playwright specs live in ./e2e and run via `npm run test:e2e`.
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
