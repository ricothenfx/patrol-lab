"use client";

import { LOCALES, LOCALE_META } from "./config";
import { useLocale } from "./LocaleProvider";

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <div className="lang-switcher" data-testid="lang-switcher" role="group" aria-label="Language">
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          className={l === locale ? "lang-btn active" : "lang-btn"}
          data-testid={`lang-${l}`}
          onClick={() => setLocale(l)}
          aria-pressed={l === locale}
          title={LOCALE_META[l].label}
        >
          {LOCALE_META[l].short}
        </button>
      ))}
    </div>
  );
}
