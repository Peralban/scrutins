"use client";

import Link from "next/link";
import { useState } from "react";
import { useApi } from "@/lib/client";
import type { DeputeData } from "@/lib/types";
import s from "./Depute.module.css";

const KINDS: [string, string][] = [["", "tous"], ["ensemble", "votes sur l'ensemble"], ["amendement", "amendements"], ["article", "articles"]];

// Votes against the group majority. The server renders the unfiltered list; a filter refetches.
export default function Dissidences({ id, initial }: { id: string; initial: DeputeData["dissidences"] }) {
  const [kind, setKind] = useState("");
  const { data, loading } = useApi<DeputeData>(kind ? `depute/${id}?kind=${kind}` : null);
  const rows = kind ? data?.dissidences ?? initial : initial;
  return (
    <>
      <div className="tools">
        {KINDS.map(([k, label]) => <button key={k} aria-pressed={kind === k} onClick={() => setKind(k)}>{label}</button>)}
        <span>{loading ? "…" : `${rows.length} affichés`}</span>
      </div>
      <div className="scroll">
        <table>
          <thead><tr><th>Date</th><th>Scrutin</th><th>Lui</th><th>Groupe</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.date}</td>
                <td className={s.t}><Link href={`/hemicycle?id=${r.id}`}>{r.titre.slice(0, 190)}</Link></td>
                <td className={r.position === "pour" ? s.pour : s.contre}>{r.position}</td>
                <td>{r.majorite}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
