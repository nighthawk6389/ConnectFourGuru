import { defineConfig } from "@playwright/test";

// Prefer the locally-cached headless-shell binary (avoids network downloads).
// If the env var is set (CI override), use that instead.
const CHROMIUM_HEADLESS =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ??
  "/root/.cache/ms-playwright/chromium_headless_shell-1194/chrome-linux/headless_shell";

/**
 * Playwright E2E configuration.
 *
 * The `webServer` block starts `next dev` on port 3001 automatically.
 * We use the locally-cached headless-shell binary so no network download
 * is required.
 */
export default defineConfig({
  testDir: "./tests/e2e",

  /* Maximum time one test can run */
  timeout: 40_000,

  /* Fail the build on CI if you accidentally left test.only in the source */
  forbidOnly: !!process.env.CI,

  /* Retry failed tests once on CI */
  retries: process.env.CI ? 1 : 0,

  /* Reporter: concise list output */
  reporter: [["list"]],

  use: {
    /* Base URL — matches the webServer below */
    baseURL: "http://localhost:3001",

    /* Collect trace on first retry to aid debugging */
    trace: "on-first-retry",
  },

  /* Start the Next.js dev server before running tests */
  webServer: {
    command: "npm run dev -- -p 3001",
    url: "http://localhost:3001",
    reuseExistingServer: true,
    timeout: 120_000,
  },

  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
        launchOptions: {
          headless: true,
          executablePath: CHROMIUM_HEADLESS,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        },
      },
    },
  ],
});
