import { defineConfig } from "@playwright/test";

// One smoke scenario in ./e2e. Requires browsers (`npx playwright install chromium`) and
// starts the dev server automatically.
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  use: { baseURL: "http://localhost:3000" },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
