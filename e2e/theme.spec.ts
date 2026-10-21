import { expect, test } from "@playwright/test";
import { setLocaleCookie } from "./support";

test("theme toggle flips data-theme and persists across reload", async ({ page }) => {
  await page.goto("/");

  const root = page.locator("html");
  // layout.tsx inline script always sets a concrete theme before paint
  await expect(root).toHaveAttribute("data-theme", /light|dark/);
  const initial = (await root.getAttribute("data-theme")) as "light" | "dark";

  const toggle = page.getByTestId("theme-toggle");
  await expect(toggle).toBeVisible();
  await toggle.click();

  const flipped = initial === "dark" ? "light" : "dark";
  await expect(root).toHaveAttribute("data-theme", flipped);

  // persisted choice survives a reload
  await page.reload();
  await expect(root).toHaveAttribute("data-theme", flipped);

  // toggling back restores the initial theme
  await toggle.click();
  await expect(root).toHaveAttribute("data-theme", initial);
});

test("light theme actually changes surface tokens", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("theme-toggle").click(); // whatever we started on, one click moves away

  const before = await page.evaluate(
    () => getComputedStyle(document.documentElement).getPropertyValue("--bg-0").trim(),
  );
  await page.getByTestId("theme-toggle").click();
  const after = await page.evaluate(
    () => getComputedStyle(document.documentElement).getPropertyValue("--bg-0").trim(),
  );
  expect(before).not.toBe("");
  expect(after).not.toBe("");
  expect(before).not.toBe(after);
});

test("FAQ page renders questions with expandable answers", async ({ page, baseURL }) => {
  // UI text assertions are locale-specific — pin English
  await setLocaleCookie(page, "en", baseURL);
  await page.goto("/faq");
  await expect(page).toHaveTitle(/FAQ · patrol-lab/);

  const items = page.getByTestId("faq-list").locator("details");
  const count = await items.count();
  expect(count).toBeGreaterThanOrEqual(8);

  const first = items.first();
  await expect(first.locator(".faq-answer")).toBeHidden();
  await first.locator("summary").click();
  await expect(first.locator(".faq-answer")).toBeVisible();

  // cross-link to Q&A exists
  await expect(page.locator(".doc-crosslink").getByRole("link", { name: "Q&A" })).toBeVisible();
});

test("Q&A page searches and filters by tag", async ({ page, baseURL }) => {
  // UI text assertions are locale-specific — pin English
  await setLocaleCookie(page, "en", baseURL);
  await page.goto("/qa");
  await expect(page).toHaveTitle(/Q&A · patrol-lab/);

  const cards = page.getByTestId("qa-card");
  const total = await cards.count();
  expect(total).toBeGreaterThanOrEqual(10);

  // tag filter narrows the list
  await page.getByTestId("qa-tags").getByRole("button", { name: "llm" }).click();
  const llmCount = await cards.count();
  expect(llmCount).toBeGreaterThan(0);
  expect(llmCount).toBeLessThan(total);

  // search narrows further and updates the counter
  await page.getByTestId("qa-search").fill("boundary");
  await expect(page.getByTestId("qa-count")).toHaveText(`1/${total} answered`);
  await expect(cards.first()).toContainText("boundary");

  // clearing restores the full list
  await page.getByTestId("qa-search").fill("");
  await page.getByTestId("qa-tags").getByRole("button", { name: "all" }).click();
  await expect(page.getByTestId("qa-count")).toHaveText(`${total}/${total} answered`);

  // empty state for a nonsense query
  await page.getByTestId("qa-search").fill("zzzznotathing");
  await expect(page.getByTestId("qa-empty")).toBeVisible();
});
