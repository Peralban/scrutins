import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Suspense } from "react";
import Nav from "@/components/Nav";
import NavFallback from "@/components/NavFallback";
import SelectionDefine from "@/components/SelectionDefine";
import Tooltip from "@/components/Tooltip";

export const metadata: Metadata = {
  title: { default: "Scrutins", template: "%s · Scrutins" },
  description: "Statistiques froides sur les votes de l'Assemblée nationale, XVIIe législature.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" data-theme="light" style={{ colorScheme: "light" }}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,500;6..72,700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap" />
      </head>
      <body>
        <Suspense fallback={<NavFallback />}>
          <Nav />
        </Suspense>
        <main>{children}</main>
        <Tooltip />
        <SelectionDefine />
      </body>
    </html>
  );
}
