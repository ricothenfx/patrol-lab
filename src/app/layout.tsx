import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "patrol-lab · mission control for autonomous inspection robots",
  description:
    "Write a mission script, watch an ANYmal C quadruped execute it on a live 3D industrial site. Deterministic, reproducible, in the browser.",
};

/* Resolves the persisted theme before first paint: localStorage override,
   else the OS preference. Dark stays the default. */
const themeInit = `try{var t=localStorage.getItem("patrol-lab-theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        {children}
      </body>
    </html>
  );
}
