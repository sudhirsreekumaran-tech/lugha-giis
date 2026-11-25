import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/nunito";
import "@fontsource-variable/noto-sans-arabic";
import "./globals.css";

export const metadata: Metadata = {
  title: "LUGHA — Play. Learn. Connect.",
  description: "An Arabic learning adventure and arcade. A GIIS Student Innovation.",
};

export default function Layout({ children }: { children: ReactNode }) {
  return <html lang="en"><body><link rel="stylesheet" href="/style.css" precedence="base" />{children}</body></html>;
}
