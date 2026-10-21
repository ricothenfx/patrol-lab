import { expect, test, type Page } from "@playwright/test";

async function patrolState(page: Page) {
  return page.evaluate(() =>
    window.__patrol
      ? {
          frames: window.__patrol.frames(),
          tris: window.__patrol.tris(),
          joints: window.__patrol.joints(),
          mode: window.__patrol.mode(),
        }
      : null,
  );
}

test("viewport loads ANYmal C, sim ticks, no page errors", async ({ page }) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(String(err)));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  await page.goto("/");
  await expect(page.getByTestId("viewport")).toBeVisible();

  // heavy robot assets (~16 MB) load async — allow generous time
  await expect(page.getByTestId("viewport-ready")).toBeAttached({ timeout: 90_000 });

  // render loop must be alive and actually drawing the robot
  await expect
    .poll(async () => (await patrolState(page))?.frames ?? 0, { timeout: 40_000 })
    .toBeGreaterThan(30);

  const state = await patrolState(page);
  expect(state).not.toBeNull();
  expect(state!.mode).toBe("idle");
  expect(state!.joints).toBe(12);
  expect(state!.tris).toBeGreaterThan(5_000);

  // frame counter keeps advancing (render loop is running, not frozen)
  const framesA = state!.frames;
  await page.waitForTimeout(500);
  const framesB = (await patrolState(page))!.frames;
  expect(framesB).toBeGreaterThan(framesA);

  expect(pageErrors, "page errors: " + pageErrors.join(" | ")).toEqual([]);
  expect(consoleErrors, "console errors: " + consoleErrors.join(" | ")).toEqual([]);

  await page.screenshot({ path: "test-results/artifacts/home.png", fullPage: false });
});
