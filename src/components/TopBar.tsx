import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSwitcher } from "@/lib/i18n/LanguageSwitcher";
import { resolveLocale } from "@/lib/i18n/server";
import { DICT } from "@/lib/i18n";

export type NavPage = "qa" | "faq";

export async function TopBar({ active, meta, right }: { active?: NavPage; meta?: string; right?: React.ReactNode }) {
  const t = DICT[await resolveLocale()];
  return (
    <header className="topbar">
      <Link href="/" className="brand" style={{ textDecoration: "none", color: "inherit" }}>
        <span className="brand-mark" />
        PATROL<span className="brand-thin">LAB</span>
      </Link>
      {meta && <div className="topbar-meta">{meta}</div>}
      <nav className="topbar-nav" data-testid="topbar-nav">
        <Link href="/qa" className={active === "qa" ? "nav-link active" : "nav-link"}>
          {t.nav.qa}
        </Link>
        <Link href="/faq" className={active === "faq" ? "nav-link active" : "nav-link"}>
          {t.nav.faq}
        </Link>
      </nav>
      <div className="topbar-status">
        {right}
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
    </header>
  );
}
