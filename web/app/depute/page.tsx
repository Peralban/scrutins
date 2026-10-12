import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import DeputeSearch from "@/components/DeputeSearch";
import { getDeputes } from "@/lib/api";

export const metadata: Metadata = { title: "Député" };

export default function Page() {
  return (
    <Suspense fallback={<p className="skeleton">Chargement…</p>}>
      <Search />
    </Suspense>
  );
}

async function Search() {
  await connection();
  const deputes = await getDeputes();
  return (
    <>
      <DeputeSearch deputes={deputes} />
      <p className="def">Choisir un député dans la recherche, ou depuis <Link href="/">le tableau des statistiques</Link>, l&apos;<Link href="/hemicycle">hémicycle</Link> ou la <Link href="/carte">carte</Link>.</p>
    </>
  );
}
