export const LOCALES = ["de", "en", "zh", "es"] as const;
export type Locale = (typeof LOCALES)[number];

/** German is the primary audience language (robotics/inspection market). */
export const DEFAULT_LOCALE: Locale = "de";

export const LOCALE_COOKIE = "patrol-lab-locale";

export const LOCALE_META: Record<Locale, { label: string; short: string }> = {
  de: { label: "Deutsch", short: "DE" },
  en: { label: "English", short: "EN" },
  zh: { label: "中文", short: "中文" },
  es: { label: "Español", short: "ES" },
};

export function isLocale(value: string | undefined | null): value is Locale {
  return (LOCALES as readonly string[]).includes(value ?? "");
}
