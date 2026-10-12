import type { Metadata } from "next";
import { Suspense } from "react";
import HemicycleView from "@/components/HemicycleView";

export const metadata: Metadata = { title: "Hémicycle" };

export default function Page() {
  return (
    <>
      <Suspense fallback={<p className="skeleton">Chargement de l&apos;hémicycle…</p>}>
        <HemicycleView />
      </Suspense>
      <footer style={{ marginTop: 40 }}>
        Un point par siège, placé d&apos;après les numéros de place réels des votes nominatifs. Un siège vacant n&apos;est pas dessiné.
        Un député qui a voté sans place connue est placé près de son groupe. Les décomptes correspondent aux chiffres officiels du scrutin.
      </footer>
    </>
  );
}
