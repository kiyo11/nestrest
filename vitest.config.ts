import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Unit + component tests only. Integration/e2e live under Playwright
// (see playwright.config.ts projects `integration` and `e2e`).
export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup/vitest.setup.ts"],
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "html"],
      reportsDirectory: "./coverage",
      include: [
        "src/lib/crypto.ts",
        "src/lib/merge.ts",
        "src/lib/rbac.ts",
        "src/lib/guest.ts",
        "src/lib/services/scheduler.ts",
        "src/lib/services/dashboard.ts",
        "src/lib/services/ical-sync.ts",
        "src/components/kpi-tile.skeleton.tsx",
        "src/components/status-badge.skeleton.tsx",
        "src/components/calendar-event-chip.skeleton.tsx",
      ],
      all: false,
    },
  },
});
