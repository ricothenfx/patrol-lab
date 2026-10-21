import { expect, test } from "@playwright/test";

test("probe orientation", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("viewport-ready")).toBeAttached({ timeout: 90_000 });
  await page.getByTestId("playback-select").selectOption("4");
  await page.getByTestId("preset-patrol_alpha").click();
  await page.getByTestId("btn-run").click();
  await expect(page.getByTestId("mission-status-pill")).toHaveText("DONE", { timeout: 90_000 });
  await page.waitForTimeout(1500);
  const o = await page.evaluate(() => window.__patrol!.orient());
  console.log("ORIENT", JSON.stringify(o));
  console.log("POSE", JSON.stringify(await page.evaluate(() => window.__patrol!.pose())));
});
