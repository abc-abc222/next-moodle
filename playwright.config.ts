import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "test-results/playwright-report" }],
  ],
  outputDir: "test-results/playwright-results",
  use: {
    baseURL: "http://127.0.0.1:3100",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "bun mock/run.ts",
      env: { MOODLE_MOCK_PORT: "28765" },
      gracefulShutdown: { signal: "SIGINT", timeout: 5_000 },
      reuseExistingServer: false,
      timeout: 120_000,
      url: "http://127.0.0.1:28765/login/token.php",
    },
    {
      command: "bun run dev --hostname 127.0.0.1 --port 3100",
      env: {
        MOODLE_BASE_URL: "http://127.0.0.1:28765",
        MOODLE_SERVICE: "moodle_mobile_app",
        NEXT_MOODLE_E2E_INSECURE_COOKIE: "1",
        NEXT_PUBLIC_DISABLE_REACT_DEVTOOLS: "1",
        NEXT_MOODLE_E2E: "1",
        SESSION_PASSWORD: "next-moodle-playwright-session-secret-32bytes",
      },
      gracefulShutdown: { signal: "SIGINT", timeout: 5_000 },
      reuseExistingServer: false,
      timeout: 120_000,
      url: "http://127.0.0.1:3100/login",
    },
  ],
});
