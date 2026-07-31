import { defineConfig, devices } from "@playwright/test";

const mockPort = process.env.MOODLE_MOCK_PORT ?? "28765";
const appPort = process.env.NEXT_MOODLE_E2E_PORT ?? "3100";

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
    baseURL: `http://127.0.0.1:${appPort}`,
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
      env: { MOODLE_MOCK_PORT: mockPort },
      gracefulShutdown: { signal: "SIGINT", timeout: 5_000 },
      reuseExistingServer: false,
      timeout: 120_000,
      url: `http://127.0.0.1:${mockPort}/login/token.php`,
    },
    {
      command: `bun run dev --hostname 127.0.0.1 --port ${appPort}`,
      env: {
        MOODLE_BASE_URL: `http://127.0.0.1:${mockPort}`,
        MOODLE_SERVICE: "moodle_mobile_app",
        NEXT_MOODLE_E2E_INSECURE_COOKIE: "1",
        NEXT_PUBLIC_DISABLE_REACT_DEVTOOLS: "1",
        NEXT_MOODLE_E2E: "1",
        SESSION_PASSWORD: "next-moodle-playwright-session-secret-32bytes",
      },
      gracefulShutdown: { signal: "SIGINT", timeout: 5_000 },
      reuseExistingServer: false,
      timeout: 120_000,
      url: `http://127.0.0.1:${appPort}/login`,
    },
  ],
});
