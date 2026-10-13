import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Suspense } from "react";
import Nav from "@/components/Nav";
import NavFallback from "@/components/NavFallback";
import Tooltip from "@/components/Tooltip";
import MobileTabs from "@/components/MobileTabs";

export const metadata: Metadata = {
  title: { default: "Scrutins", template: "%s · Scrutins" },
  description: "Statistiques froides sur les votes de l'Assemblée nationale, XVIIe législature.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr">
      <body>
        <main>
          <h1>Scrutins</h1>
          <Suspense fallback={<NavFallback />}>
            <Nav />
          </Suspense>
          {children}
        </main>
        <Suspense fallback={null}><MobileTabs /></Suspense>
        <Tooltip />
      </body>
    </html>
  );
}
