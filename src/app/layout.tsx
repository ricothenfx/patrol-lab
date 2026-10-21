import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "patrol-lab · mission control for autonomous inspection robots",
  description:
    "Write a mission script, watch an ANYmal C quadruped execute it on a live 3D industrial site. Deterministic, reproducible, in the browser.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
