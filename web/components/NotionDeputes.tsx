"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MIN_VOTES_VERDICT, pct, verdict } from "@/lib/format";
import type { NotionDetail } from "@/lib/types";
import s from "./Notions.module.css";

type Row = NotionDetail["deputes"][number];
type Key = "nom" | "groupe" | "favorables" | "defavorables" | "part";
const COLS: [Key, string][] = [["nom", "Nom"], ["groupe", "Groupe"], ["favorables", "Favorables"], ["defavorables", "Défavorables"], ["part", "% favorable"]];

export default function NotionDeputes({ deputes }: { deputes: Row[] }) {
  const [min, setMin] = useState(MIN_VOTES_VERDICT);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: "part", dir: -1 });

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const part = (r: Row) => (r.favorables + r.defavorables ? (100 * r.favorables) / (r.favorables + r.defavorables) : -1);
    return deputes
      .filter((r) => r.nom.toLowerCase().includes(needle) && (needle !== "" || r.favorables + r.defavorables >= min))
      .sort((a, b) => {
        const k = sort.key;
        const x = k === "part" ? part(a) : a[k], y = k === "part" ? part(b) : b[k];
        return (typeof x === "string" || typeof y === "string" ? String(x ?? "").localeCompare(String(y ?? "")) : (x as number) - (y as number)) * sort.dir;
      });
  }, [deputes, min, q, sort]);

  const onSort = (key: Key) => setSort((p) => ({ key, dir: p.key === key ? (-p.dir as 1 | -1) : key === "nom" || key === "groupe" ? 1 : -1 }));

  return (
    <>
      <div className="tools">
        <label>min. votes (favorables + défavorables) <input type="number" min={1} value={min} onChange={(e) => setMin(+e.target.value || 1)} style={{ width: 70 }} /></label>
        <label title="la recherche par nom ignore le minimum">recherche <input type="search" placeholder="nom" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <span>{rows.length} / {deputes.length}</span>
      </div>
      <div className="scroll">
        <table>
          <thead>
            <tr>
              {COLS.map(([k, label]) => (
                <th key={k} onClick={() => onSort(k)} aria-sort={sort.key === k ? (sort.dir < 0 ? "descending" : "ascending") : undefined}>{label}{sort.key === k ? (sort.dir < 0 ? " ↓" : " ↑") : ""}</th>
              ))}
              <th>Lecture</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const v = verdict(r.favorables, r.defavorables);
              return (
                <tr key={r.id}>
                  <td className={s.t}><Link href={`/depute/${r.id}`}>{r.nom}</Link></td>
                  <td>{r.groupe}</td><td>{r.favorables}</td><td>{r.defavorables}</td>
                  <td><span className={s.gauge}><b style={{ width: `${v.part ?? 0}%` }} /></span> {v.part == null ? "—" : pct(v.part)}</td>
                  <td className={s[v.tone]}>{v.label}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
