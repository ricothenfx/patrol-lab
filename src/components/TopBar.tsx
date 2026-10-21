import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

export type NavPage = "qa" | "faq";

export function TopBar({ active, meta, right }: { active?: NavPage; meta?: string; right?: React.ReactNode }) {
  return (
    <header className="topbar">
      <Link href="/" className="brand" style={{ textDecoration: "none", color: "inherit" }}>
        <span className="brand-mark" />
        PATROL<span className="brand-thin">LAB</span>
      </Link>
      {meta && <div className="topbar-meta">{meta}</div>}
      <nav className="topbar-nav" data-testid="topbar-nav">
        <Link href="/qa" className={active === "qa" ? "nav-link active" : "nav-link"}>
          Q&A
        </Link>
        <Link href="/faq" className={active === "faq" ? "nav-link active" : "nav-link"}>
          FAQ
        </Link>
      </nav>
      <div className="topbar-status">
        {right}
        <ThemeToggle />
      </div>
    </header>
  );
}
