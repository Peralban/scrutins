import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import DeputesTable from "@/components/DeputesTable";
import { getDeputes } from "@/lib/api";

export const metadata: Metadata = { title: "Députés" };

export default function Page() {
  return (
    <>
      <h1 className="page-title">Les députés</h1>
      <p className="def" style={{ marginBottom: 20 }}>Tous les députés ayant siégé pendant la législature. Cherche un nom, ou trie par dissidence, votes exprimés ou délégation ; un clic ouvre la fiche.</p>
      <Suspense fallback={<p className="skeleton">Chargement des députés…</p>}>
        <List />
      </Suspense>
    </>
  );
}

async function List() {
  await connection();
  return <DeputesTable deputes={await getDeputes()} />;
}
