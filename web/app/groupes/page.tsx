import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import s from "@/components/Groupe.module.css";
import { getGroupes } from "@/lib/api";
import { NEUTRAL, pct, politicalRank } from "@/lib/format";

export const metadata: Metadata = { title: "Groupes" };

export default function Page() {
  return (
    <>
      <h1 className="page-title">Les groupes</h1>
      <p className="def" style={{ marginBottom: 24 }}>Pour chaque groupe : ce que ses députés votent sujet par sujet, qui en fait partie, et avec quels autres groupes il vote. Classés de gauche à droite dans l&apos;hémicycle.</p>
      <Suspense fallback={<p className="skeleton">Chargement des groupes…</p>}>
        <List />
      </Suspense>
    </>
  );
}

async function List() {
  await connection();
  const groupes = (await getGroupes()).filter((g) => g.id !== "PO847173").sort((a, b) => politicalRank(a.sigle) - politicalRank(b.sigle));
  return (
    <div className={s.list}>
      {groupes.map((g) => (
        <Link key={g.id} href={`/groupes/${g.id}`} className={s.card}>
          <span className={s.swatch} style={{ background: g.couleur ?? NEUTRAL }} />
          <span>
            <b>{g.sigle}</b>
            <span>{g.nom}</span>
            <small>discipline {pct(g.cohesion)} · présence {pct(g.participation)}</small>
          </span>
        </Link>
      ))}
    </div>
  );
}
