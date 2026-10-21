import { expect, test, type Page } from "@playwright/test";

async function waitForRobot(page: Page) {
  await expect(page.getByTestId("viewport-ready")).toBeAttached({ timeout: 90_000 });
}

async function noPageErrors(page: Page, errors: string[]) {
  expect(errors, "page errors: " + errors.join(" | ")).toEqual([]);
}

test("golden mission runs end-to-end: DONE, findings logged, robot moved", async ({ page }) => {
  test.setTimeout(180_000); // full mission at 4x + asset load on a 4-core host
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(String(err)));

  await page.goto("/");
  await waitForRobot(page);

  // fast-forward: 4× playback keeps e2e honest but quick
  await page.getByTestId("playback-select").selectOption("4");

  await page.getByTestId("preset-patrol_alpha").click();
  await page.getByTestId("btn-run").click();

  await expect(page.getByTestId("mission-status-pill")).toHaveText("DONE", { timeout: 90_000 });

  // patrol_alpha has 4 INSPECT statements → exactly 4 findings (deterministic)
  const findingText = await page.getByTestId("finding-count").textContent();
  expect(findingText).toContain("4 findings");

  // mission log captured the journey
  const events = await page.getByTestId("event-row").count();
  expect(events).toBeGreaterThanOrEqual(6);

  // clock advanced and a target line was executed
  const line = await page.getByTestId("current-line").textContent();
  expect(Number(line)).toBeGreaterThan(0);

  // control-room layer: telemetry card + tac map reflect real sim state
  await expect(page.getByTestId("kpi-card")).toBeVisible();
  // patrol_alpha inspects 3 distinct POIs (gauge_bank twice) — deterministic
  await expect(page.getByTestId("kpi-coverage")).toContainText("3/5");
  const odo = await page.getByTestId("kpi-odo").textContent();
  expect(parseFloat(odo!)).toBeGreaterThan(10);
  await expect(page.getByTestId("minimap")).toBeVisible();
  await expect(page.locator('[data-testid="kpi-pois"] .poi-chip').first()).toBeAttached();
  // all chips marked inspected after the mission
  expect(await page.locator('[data-testid="kpi-pois"] .poi-done').count()).toBe(3);

  const poseEnd = await page.evaluate(() => window.__patrol!.pose());
  expect(poseEnd.x).not.toBe(0); // robot actually left the origin

  await noPageErrors(page, pageErrors);
  await page.screenshot({ path: "test-results/artifacts/mission-done.png" });
});

test("invalid mission surfaces parse errors and refuses to run", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(String(err)));

  await page.goto("/");
  await waitForRobot(page);

  const content = page.locator(".cm-content");
  await content.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type("MISSION broken\n  FLY away\nEND");

  await page.getByTestId("btn-run").click();

  await expect(page.getByTestId("run-error")).toBeVisible();
  await expect(page.getByTestId("run-error")).toContainText("parse error");
  await expect(page.getByTestId("mission-status-pill")).toHaveText("IDLE");

  await noPageErrors(page, pageErrors);
});

test("step mode advances one line at a time while paused", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(String(err)));

  await page.goto("/");
  await waitForRobot(page);

  await page.getByTestId("preset-patrol_alpha").click();
  await page.getByTestId("btn-step").click();

  await expect(page.getByTestId("mission-status-pill")).toHaveText("PAUSED");
  const first = await page.getByTestId("current-line").textContent();
  expect(Number(first)).toBeGreaterThan(0);

  await page.getByTestId("btn-step").click();
  const second = await page.getByTestId("current-line").textContent();
  expect(Number(second)).toBeGreaterThanOrEqual(Number(first));

  await noPageErrors(page, pageErrors);
});
