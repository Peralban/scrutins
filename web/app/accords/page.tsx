import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import AccordsView from "@/components/AccordsView";
import { getDeputes } from "@/lib/api";

export const metadata: Metadata = { title: "Accords" };

export default function Page() {
  return (
    <Suspense fallback={<p className="skeleton">Chargement…</p>}>
      <Accords />
    </Suspense>
  );
}

async function Accords() {
  await connection();
  const deputes = await getDeputes();
  return <AccordsView deputes={deputes} />;
}
