import { expect, test } from "@playwright/test";

/**
 * UI locale contract: German is the default (fresh context = no locale
 * cookie), the topbar switcher updates client + server-rendered text and
 * persists the choice via the patrol-lab-locale cookie.
 */

test("default locale is German on a fresh context", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  await expect(page.locator(".pane-title")).toHaveText("MISSIONSEDITOR");
  await expect(page.getByTestId("lang-de")).toHaveAttribute("aria-pressed", "true");
});

test("switcher updates UI text, html lang, and persists across reload", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("lang-en").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator(".pane-title")).toHaveText("MISSION EDITOR");

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator(".pane-title")).toHaveText("MISSION EDITOR");

  await page.getByTestId("lang-zh").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh");
  await expect(page.locator(".pane-title")).toHaveText("任务编辑器");

  await page.getByTestId("lang-es").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.locator(".pane-title")).toHaveText("EDITOR DE MISIÓN");
});

test("content pages follow the active locale", async ({ page }) => {
  await page.goto("/faq");
  await expect(page.locator("h1.doc-title")).toHaveText("Häufig gestellte Fragen");
  const items = page.getByTestId("faq-list").locator("details");
  expect(await items.count()).toBeGreaterThanOrEqual(8);

  // switching from within the page refreshes the server-rendered content too
  await page.getByTestId("lang-en").click();
  await expect(page.locator("h1.doc-title")).toHaveText("Frequently asked questions");

  await page.goto("/qa");
  await expect(page.locator("h1.doc-title")).toHaveText("Technical questions & answers");
  await expect(page.getByTestId("qa-count")).toContainText("answered");
});
