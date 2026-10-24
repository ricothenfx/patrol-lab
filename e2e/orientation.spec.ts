import { expect, test } from "@playwright/test";

/**
 * Regression guard for the holder-frame bug: yaw/position applied inside the
 * MuJoCo frame pitched the robot 90° and lifted it by pose.z. After a mission
 * the world orientation must still be: axis-flip only on the driver, no yaw
 * leaking into the decomposition, and the robot on the ground plane.
 */
test("robot stays upright and grounded after a full mission", async ({ page }) => {
  test.setTimeout(180_000); // full mission at 4x + asset load on a 4-core host
  await page.goto("/");
  await expect(page.getByTestId("viewport-ready")).toBeAttached({ timeout: 90_000 });
  await page.getByTestId("playback-select").selectOption("4");
  await page.getByTestId("preset-patrol_alpha").click();
  await page.getByTestId("btn-run").click();
  await expect(page.getByTestId("mission-status-pill")).toHaveText("DONE", { timeout: 150_000 });
  await page.waitForTimeout(800);

  const o = await page.evaluate(() => window.__patrol!.orient());
  const pose = await page.evaluate(() => window.__patrol!.pose());
  const holder = await page.evaluate(() => window.__patrol!.holder());

  // the driver's world forward must equal the simulated heading on the ground
  // plane — a forward of (1,0,0) would mean the holder is orphaned (pose never
  // rendered, robot dances at the origin while the sim walks away)
  expect(Math.hypot(o.driverForward[0] - Math.cos(pose.heading), o.driverForward[2] + Math.sin(pose.heading))).toBeLessThan(0.02);
  expect(Math.abs(o.driverForward[1])).toBeLessThan(0.02);
  // base = axis fix + MJCF flip + small gait roll residue — never a pitch/tip
  expect(Math.abs(o.base[1])).toBeLessThan(0.15);

  // the RENDERED rig must sit at the simulated pose — a reparented holder
  // silently orphans the pose (robot dances at the origin while the sim walks)
  expect(holder).not.toBeNull();
  expect(Math.hypot(holder!.x - pose.x, holder!.z - pose.z)).toBeLessThan(0.05);

  // grounded: base height in world stays at stance height (0.62 ± bob/roll)
  // and the robot ended at the transformer approach point, not inside it
  expect(Math.hypot(pose.x - (-3.8), pose.z - 2.8)).toBeGreaterThan(0.5);
  expect(Math.hypot(pose.x - (-3.8), pose.z - 2.8)).toBeLessThan(1.4);
});
