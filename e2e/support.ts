import type { Page } from "@playwright/test";
import type { Locale } from "../src/lib/i18n/config";

/** Pin the UI locale cookie before navigation so SSR renders that language. */
export async function setLocaleCookie(page: Page, locale: Locale, baseURL?: string): Promise<void> {
  const url = baseURL ?? "http://127.0.0.1:3031";
  await page.context().addCookies([{ name: "patrol-lab-locale", value: locale, url }]);
}
