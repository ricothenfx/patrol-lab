/**
 * Autonomous frontend recording for movement review.
 * Records video + 10 Hz pose telemetry of a mission run in both
 * locomotion modes (kinematic, dynamics), then saves artifacts to OUT_DIR.
 *
 * Usage: node scripts/record_review.mjs [--kinematic-only] [--dynamics-only]
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.E2E_BASE_URL || "http://127.0.0.1:3031";
const OUT = process.env.OUT_DIR || "/tmp/kilo/patrol-review";
const KINEMATIC_ONLY = process.argv.includes("--kinematic-only");
const DYNAMICS_ONLY = process.argv.includes("--dynamics-only");

// multi-GOTO mission: several sharp turns + inspections — the messiest scenario
const MISSION = `# movement review sweep
MISSION review_sweep

SPEED 1.0
GOTO pump_station
INSPECT pump_station THERMAL
GOTO transformer_row
INSPECT transformer_row THERMAL
GOTO gauge_bank
INSPECT gauge_bank THERMAL
GOTO tank_farm
INSPECT tank_farm THERMAL
END`;

fs.mkdirSync(OUT, { recursive: true });

async function samplePose(page, sink, stop) {
  while (!stop.done) {
    try {
      const p = await page.evaluate(() => {
        const w = window.__patrol;
        if (!w) return null;
        return {
          pose: w.pose(),
          orient: w.orient(),
          cam: w.camera ? w.camera() : null,
          holder: w.holder ? w.holder() : null,
          t: performance.now() / 1000,
          frames: w.frames(),
        };
      });
      if (p) sink.push(p);
    } catch {
      /* page navigating */
    }
    await new Promise((r) => setTimeout(r, 100));
  }
}

async function waitText(page, testid, text, timeout) {
  await page.waitForFunction(
    ({ sel, want }) => document.querySelector(`[data-testid="${sel}"]`)?.textContent?.trim() === want,
    { sel: testid, want: text },
    { timeout },
  );
}

async function runMission(page, { label, dynamics }) {
  const dir = path.join(OUT, label);
  fs.mkdirSync(dir, { recursive: true });

  await page.goto(BASE + "/");
  await page.getByTestId("viewport-ready").waitFor({ state: "attached", timeout: 90_000 });

  if (dynamics) {
    await page.getByTestId("loc-toggle").click();
    await waitText(page, "loc-toggle", "DYNAMICS (BETA)", 180_000);
  }

  // type the review mission into the editor
  await page.locator(".cm-content").click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type(MISSION);

  // real-time playback: 1x is what a visitor sees
  await page.getByTestId("playback-select").selectOption("1");

  const samples = [];
  const stop = { done: false };
  const sampler = samplePose(page, samples, stop);

  await page.getByTestId("btn-run").click();
  await waitText(page, "mission-status-pill", "DONE", 600_000);
  // a second of settle after DONE
  await page.waitForTimeout(1500);
  stop.done = true;
  await sampler;

  fs.writeFileSync(path.join(dir, "telemetry.json"), JSON.stringify(samples, null, 1));
  console.log(`[${label}] DONE — ${samples.length} pose samples`);
}

const browser = await chromium.launch();
const errors = [];

if (!DYNAMICS_ONLY) {
  const ctx = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    recordVideo: { dir: path.join(OUT, "kinematic"), size: { width: 1600, height: 900 } },
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`[kin] ${e}`));
  await page.context().addCookies([{ name: "patrol-lab-locale", value: "en", url: BASE }]);
  await runMission(page, { label: "kinematic", dynamics: false });
  await ctx.close(); // flushes the video
}

if (!KINEMATIC_ONLY) {
  const ctx = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    recordVideo: { dir: path.join(OUT, "dynamics"), size: { width: 1600, height: 900 } },
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`[dyn] ${e}`));
  await page.context().addCookies([{ name: "patrol-lab-locale", value: "en", url: BASE }]);
  try {
    await runMission(page, { label: "dynamics", dynamics: true });
  } catch (e) {
    errors.push(`[dyn] run failed: ${e}`);
  }
  await ctx.close();
}

await browser.close();
fs.writeFileSync(path.join(OUT, "errors.json"), JSON.stringify(errors, null, 1));
console.log("page errors:", errors.length ? errors : "none");
