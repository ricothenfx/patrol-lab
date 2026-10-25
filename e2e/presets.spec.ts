import { expect, test, type Page } from "@playwright/test";
import { setLocaleCookie } from "./support";

/**
 * Autonomous all-presets verification: every mission scenario in the editor
 * must run end-to-end locally — DONE status, deterministic finding count
 * (one finding per INSPECT statement), correct POI coverage, real robot
 * movement, no page errors.
 *
 * Heavy by design (8 full missions at 4x on the 4-core host, ~15 min) —
 * skipped in CI, which already covers the golden mission; run manually:
 *
 *   npx playwright test e2e/presets.spec.ts
 */

// preset id -> [expected findings, expected distinct POIs covered]
const EXPECTATIONS: Record<string, [number, number]> = {
  patrol_alpha: [4, 3],
  valve_sweep: [3, 2],
  beta_patrol: [2, 1],
  full_circuit: [8, 5],
  night_shift: [5, 3],
  vib_watch: [4, 3],
  gas_patrol: [5, 2],
  sprint_audit: [4, 4],
};

async function waitForRobot(page: Page) {
  await expect(page.getByTestId("viewport-ready")).toBeAttached({ timeout: 90_000 });
}

test.describe.configure({ mode: "serial" });

test.skip(process.env.CI, "full 8-mission sweep is a local/manual check — CI runs the golden mission");

test("editor exposes all eight mission scenarios", async ({ page, baseURL }) => {
  await setLocaleCookie(page, "en", baseURL);
  await page.goto("/");
  await waitForRobot(page);
  for (const id of Object.keys(EXPECTATIONS)) {
    await expect(page.getByTestId(`preset-${id}`)).toBeVisible();
  }
});

for (const [id, [findings, coverage]] of Object.entries(EXPECTATIONS)) {
  test(`scenario ${id} runs to DONE with ${findings} findings and ${coverage}/5 coverage`, async ({
    page,
    baseURL,
  }) => {
    test.setTimeout(300_000); // headless SwiftShader ~3 fps caps 4x playback
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(String(err)));

    await setLocaleCookie(page, "en", baseURL);
    await page.goto("/");
    await waitForRobot(page);

    await page.getByTestId("playback-select").selectOption("4");
    await page.getByTestId(`preset-${id}`).click();
    await page.getByTestId("btn-run").click();

    // editor picked up the scenario verbatim
    await expect(page.locator(".ms-name")).toContainText(id, { timeout: 20_000 });

    await expect(page.getByTestId("mission-status-pill")).toHaveText("DONE", {
      timeout: 280_000,
    });

    // deterministic: exactly one finding per INSPECT statement
    const findingText = await page.getByTestId("finding-count").textContent();
    expect(findingText).toContain(`${findings} findings`);

    // coverage: distinct POIs the mission inspected
    await expect(page.getByTestId("kpi-coverage")).toContainText(`${coverage}/5`);

    // control-room reflects a real run: clock advanced, odometer positive,
    // event log populated, mission executed at least one line
    const clock = await page.getByTestId("mission-clock").textContent();
    expect(clock).not.toMatch(/^0:00\.0$/);
    const odo = await page.getByTestId("kpi-odo").textContent();
    expect(parseFloat(odo!)).toBeGreaterThan(0);
    expect(await page.getByTestId("event-row").count()).toBeGreaterThanOrEqual(2);
    const line = await page.getByTestId("current-line").textContent();
    expect(Number(line)).toBeGreaterThan(0);
    await expect(page.getByTestId("minimap")).toBeVisible();

    // the robot actually left the origin
    const poseEnd = await page.evaluate(() => window.__patrol!.pose());
    expect(Math.abs(poseEnd.x)).toBeGreaterThan(0.01);

    expect(pageErrors, "page errors: " + pageErrors.join(" | ")).toEqual([]);
  });
}
