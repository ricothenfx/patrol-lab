import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  retries: 1, // 4-core VPS: sequential chromium runs can flake on cold asset loads
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  outputDir: "test-results",
  use: {
    // E2E_BASE_URL=https://patrol-lab.vercel.app npx playwright test  -> run against production
    baseURL: process.env.E2E_BASE_URL || "http://127.0.0.1:3031",
    viewport: { width: 1600, height: 900 },
    video: "retain-on-failure",
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        // port 3031 registered in ~/PORTS.md (patrol-lab dev/test) — never 3000,
        // that host runs other production stacks
        command: "npx next start -p 3031",
        url: "http://127.0.0.1:3031",
        timeout: 120_000,
        reuseExistingServer: !process.env.CI,
      },
});
