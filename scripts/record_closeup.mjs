/**
 * Close-up gait recording: orbit camera, zoomed in, mission running at 1x.
 * Produces a short webm focused on the robot's legs (kinematic mode).
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.E2E_BASE_URL || "http://127.0.0.1:3031";
const OUT = process.env.OUT_DIR || "/tmp/kilo/patrol-review";
fs.mkdirSync(OUT, { recursive: true });

const MISSION = `MISSION closeup
SPEED 1.0
GOTO transformer_row
INSPECT transformer_row THERMAL
GOTO gauge_bank
INSPECT gauge_bank THERMAL
END`;

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1600, height: 900 },
  recordVideo: { dir: path.join(OUT, "closeup"), size: { width: 1600, height: 900 } },
});
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.context().addCookies([{ name: "patrol-lab-locale", value: "en", url: BASE }]);

await page.goto(BASE + "/");
await page.getByTestId("viewport-ready").waitFor({ state: "attached", timeout: 90_000 });

// orbit camera + zoom in (wheel toward viewer = smaller distance)
await page.getByTestId("cam-toggle").click();
const canvas = page.locator("canvas[data-engine]").first();
await canvas.click({ button: "right" }); // focus
for (let i = 0; i < 12; i++) {
  await page.mouse.move(950, 450);
  await page.mouse.wheel(0, -120);
  await page.waitForTimeout(80);
}
// nudge the orbit angle to a three-quarter view
await page.mouse.move(950, 450);
await page.mouse.down();
await page.mouse.move(1150, 380, { steps: 20 });
await page.mouse.up();
for (let i = 0; i < 4; i++) {
  await page.mouse.wheel(0, -120);
  await page.waitForTimeout(60);
}

await page.locator(".cm-content").click();
await page.keyboard.press("ControlOrMeta+a");
await page.keyboard.type(MISSION);

// wait until the robot starts walking, then record ~40 s of close-up
await page.getByTestId("btn-run").click();
await page.waitForTimeout(40_000);

const pose = await page.evaluate(() => window.__patrol.pose());
console.log("pose at end of closeup:", JSON.stringify(pose));
await ctx.close();
await browser.close();
fs.writeFileSync(path.join(OUT, "closeup-errors.json"), JSON.stringify(errors));
console.log("errors:", errors.length ? errors : "none");
