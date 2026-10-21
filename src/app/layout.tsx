import type { Metadata } from "next";
import "./globals.css";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { resolveLocale } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "patrol-lab · mission control for autonomous inspection robots",
  description:
    "Write a mission script, watch an ANYmal C quadruped execute it on a live 3D industrial site. Deterministic, reproducible, in the browser.",
};

/* The locale cookie must be resolved during SSR (no locale flash, no hydration
   mismatch), so every route renders blocking-dynamic instead of prerendered. */
export const instant = false;

/* Resolves the persisted theme before first paint: localStorage override,
   else the OS preference. Dark stays the default. */
const themeInit = `try{var t=localStorage.getItem("patrol-lab-theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}document.documentElement.dataset.theme=t}catch(e){}`;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await resolveLocale();
  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <LocaleProvider initialLocale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
