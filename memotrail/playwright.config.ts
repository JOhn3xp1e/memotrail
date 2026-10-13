import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  // Historical Mimo feature tests are retained; the mascot and assistant are no longer mounted.
  testIgnore: ["**/mimo.spec.ts", "**/mimo-assets.spec.ts", "**/mimo-assistant.spec.ts", "**/mimo-strips.spec.ts"],
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    channel: "chrome",
    headless: true,
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: `${process.platform === "win32" ? "npm.cmd" : "npm"} run preview -- --host 127.0.0.1 --port 4173 --strictPort`,
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
