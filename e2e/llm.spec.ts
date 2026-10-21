import { expect, test } from "@playwright/test";

test("NL→DSL compiler (mock) proposes, human accepts, mission runs", async ({ page }) => {
  test.setTimeout(180_000);
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(String(err)));

  await page.goto("/");
  await expect(page.getByTestId("viewport-ready")).toBeAttached({ timeout: 90_000 });

  await page.getByTestId("nl-open").click();
  await page.getByTestId("nl-input").fill("gas watch on the valve manifold");
  await page.getByTestId("nl-compile").click();

  await expect(page.getByTestId("nl-preview")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("nl-preview")).toContainText("MISSION");
  await expect(page.getByTestId("nl-preview")).toContainText("MOCK");

  await page.getByTestId("nl-accept").click();
  await expect(page.locator(".cm-content")).toContainText("nl_gas_watch");

  // the accepted mission is a valid one — run it to DONE
  await page.getByTestId("playback-select").selectOption("4");
  await page.getByTestId("btn-run").click();
  await expect(page.getByTestId("mission-status-pill")).toHaveText("DONE", { timeout: 90_000 });

  // grounded report (rule-based without an API key)
  await page.getByTestId("report-generate").click();
  await expect(page.getByTestId("report-body")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("report-body")).toContainText("RULE-BASED");
  await expect(page.getByTestId("report-body")).toContainText("seed");

  expect(pageErrors, "page errors: " + pageErrors.join(" | ")).toEqual([]);
});
