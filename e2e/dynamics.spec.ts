import { expect, test } from "@playwright/test";
import { setLocaleCookie } from "./support";

/**
 * DYNAMICS (beta): switches the physics backend on, runs the gentle-arc
 * demo mission under real MuJoCo stepping, and checks the honest contract:
 * mission completes, findings logged, odometer reflects real motion, pose
 * stays finite, no page errors.
 */
// video encoding steals frames from the physics loop on loaded runners —
// the first attempt kept starving the mission into the timeout
test.use({ video: "off" });

test("dynamics (beta): physics switch + beta_patrol completes", async ({ page, baseURL }) => {
  test.setTimeout(540_000);
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(String(err)));

  await setLocaleCookie(page, "en", baseURL);
  await page.goto("/");
  await expect(page.getByTestId("viewport-ready")).toBeAttached({ timeout: 90_000 });

  // switch the physics backend on (WASM + assets load on first use)
  await page.getByTestId("loc-toggle").click();
  await expect(page.getByTestId("loc-toggle")).toHaveText("DYNAMICS (BETA)", { timeout: 120_000 });
  const loc = await page.evaluate(() => window.__patrol!.loc());
  expect(loc).toBe("dynamics");

  // fast-forward the gentle-arc demo mission
  await page.getByTestId("playback-select").selectOption("4");
  await page.getByTestId("preset-beta_patrol").click();
  await page.getByTestId("btn-run").click();

  await expect(page.getByTestId("mission-status-pill")).toHaveText("DONE", { timeout: 480_000 });

  const findingText = await page.getByTestId("finding-count").textContent();
  expect(findingText).toContain("2 findings");

  // physics actually moved the body and every number stays finite
  const pose = await page.evaluate(() => window.__patrol!.pose());
  expect(Number.isFinite(pose.x + pose.z)).toBe(true);
  const odo = parseFloat((await page.getByTestId("kpi-odo").textContent())!);
  expect(odo).toBeGreaterThan(2);

  expect(errors, "page errors: " + errors.join(" | ")).toEqual([]);
});
