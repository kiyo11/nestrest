import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

// Load a dedicated test env if present (NEVER the shared Neon dev branch).
// See tests/README.md for how to provision a throwaway Postgres.
loadEnv({ path: ".env.test" });
loadEnv({ path: ".env.local" }); // fallback; override DATABASE_URL in .env.test

const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  // Run serially: these suites share one real database and reset between files.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [["list"]],
  // Only the e2e project needs a browser + running app. Playwright starts this
  // dev server for any run; integration specs simply never navigate to it.
  // Tee dev-server output to a log file so the owner magic-link flow can read
  // the sign-in URL the dev mailer prints (see tests/e2e/helpers).
  webServer: process.env.PW_NO_SERVER
    ? undefined
    : {
        command: `mkdir -p .playwright && npm run dev -- --port ${PORT} 2>&1 | tee .playwright/dev.log`,
        url: BASE_URL,
        timeout: 120_000,
        reuseExistingServer: !process.env.CI,
      },
  projects: [
    {
      // Integration: call server actions / services / route handlers against a
      // REAL throwaway Postgres. No browser. See tests/integration/*.
      name: "integration",
      testDir: "./tests/integration",
      use: {},
    },
    {
      // E2E: real browser against a seeded DB + dev server.
      name: "e2e",
      testDir: "./tests/e2e",
      use: { ...devices["Desktop Chrome"], baseURL: BASE_URL },
    },
  ],
});
