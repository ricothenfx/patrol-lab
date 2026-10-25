import { expect, test, type Page } from "@playwright/test";
import { setLocaleCookie } from "./support";

/**
 * Production smoke pass — the single allowed light check against the live
 * site (AGENTS.md: never the full suite against production, one smoke pass
 * via E2E_BASE_URL at most). Skipped unless E2E_BASE_URL is set:
 *
 *   E2E_BASE_URL=https://patrol-lab.ricothen.com npx playwright test e2e/prod-smoke.spec.ts
 *
 * Verifies the deploy serves every mission scenario and that one short
 * mission (beta_patrol, 2 inspections) actually completes on production.
 */

const PRESET_IDS = [
  "patrol_alpha",
  "valve_sweep",
  "beta_patrol",
  "full_circuit",
  "night_shift",
  "vib_watch",
  "gas_patrol",
  "sprint_audit",
];

test.skip(!process.env.E2E_BASE_URL, "production smoke runs only with E2E_BASE_URL set");

async function waitForRobot(page: Page) {
  await expect(page.getByTestId("viewport-ready")).toBeAttached({ timeout: 90_000 });
}

test("production serves all scenarios and runs a mission end-to-end", async ({ page, baseURL }) => {
  test.setTimeout(240_000);
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(String(err)));

  await setLocaleCookie(page, "en", baseURL);
  await page.goto("/");
  await waitForRobot(page);

  // the deployed bundle contains every scenario button
  for (const id of PRESET_IDS) {
    await expect(page.getByTestId(`preset-${id}`)).toBeVisible();
  }

  // shortest mission completes on the live site
  await page.getByTestId("playback-select").selectOption("4");
  await page.getByTestId("preset-beta_patrol").click();
  await page.getByTestId("btn-run").click();
  await expect(page.getByTestId("mission-status-pill")).toHaveText("DONE", { timeout: 200_000 });
  await expect(page.getByTestId("finding-count")).toContainText("2 findings");
  await expect(page.getByTestId("kpi-coverage")).toContainText("1/5");

  expect(pageErrors, "page errors: " + pageErrors.join(" | ")).toEqual([]);
});
