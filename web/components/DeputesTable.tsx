"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { fmt, pct } from "@/lib/format";
import type { DeputeRow } from "@/lib/types";

type Key = "nom" | "groupe" | "votes_exprimes" | "dissidence" | "delegation";
const COLS: [Key, string][] = [["nom", "Nom"], ["groupe", "Groupe"], ["votes_exprimes", "Votes exprimés"], ["dissidence", "Dissidence"], ["delegation", "Délégation"]];

export default function DeputesTable({ deputes }: { deputes: DeputeRow[] }) {
  const [min, setMin] = useState(200);
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(30);
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: "dissidence", dir: -1 });

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    // A name search ignores the minimum, so deputies with few or no votes stay findable.
    return deputes
      .filter((d) => d.nom.toLowerCase().includes(needle) && (needle !== "" || d.votes_exprimes >= min))
      .sort((a, b) => {
        const x = a[sort.key], y = b[sort.key];
        return (typeof x === "string" || typeof y === "string" ? String(x ?? "").localeCompare(String(y ?? "")) : (x ?? -1) - (y ?? -1)) * sort.dir;
      });
  }, [deputes, min, q, sort]);

  const onSort = (key: Key) => setSort((s) => ({ key, dir: s.key === key ? (-s.dir as 1 | -1) : key === "nom" || key === "groupe" ? 1 : -1 }));

  return (
    <>
      <div className="tools">
        <label>min. votes exprimés <input type="number" value={min} min={1} onChange={(e) => setMin(+e.target.value || 1)} style={{ width: 80 }} /></label>
        <label title="la recherche par nom ignore le minimum">recherche <input type="search" placeholder="nom" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <label className="m-only">trier par
          <select value={`${sort.key}:${sort.dir}`} onChange={(e) => { const [k, d] = e.target.value.split(":"); setSort({ key: k as Key, dir: +d as 1 | -1 }); }}>
            <option value="dissidence:-1">dissidence, la plus forte</option>
            <option value="dissidence:1">dissidence, la plus faible</option>
            <option value="votes_exprimes:-1">votes exprimés</option>
            <option value="delegation:-1">délégation</option>
            <option value="nom:1">nom (A→Z)</option>
            <option value="groupe:1">groupe</option>
          </select>
        </label>
        <span>{rows.length} / {deputes.length}</span>
      </div>
      <ol className="dep-cards m-only">
        {rows.slice(0, shown).map((d, i) => (
          <li key={d.id}>
            <Link href={`/depute/${d.id}`}>
              <span className="rank">{i + 1}</span>
              <span className="who"><b>{d.nom}</b><small>{d.groupe ?? "—"} · {fmt.format(d.votes_exprimes)} votes · délég. {pct(d.delegation)}</small></span>
              <span className="num"><b>{pct(d.dissidence)}</b><small>dissidence</small></span>
            </Link>
          </li>
        ))}
      </ol>
      {rows.length > shown && <button className="more m-only" onClick={() => setShown((n) => n + 50)}>Afficher 50 de plus ({rows.length - shown} restants)</button>}
      <div className="scroll d-only">
        <table>
          <thead>
            <tr>
              {COLS.map(([key, label]) => (
                <th key={key} onClick={() => onSort(key)} aria-sort={sort.key === key ? (sort.dir < 0 ? "descending" : "ascending") : undefined}>
                  {label}{sort.key === key ? (sort.dir < 0 ? " ↓" : " ↑") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id}>
                <td><Link href={`/depute/${d.id}`} style={{ color: "inherit" }}>{d.nom}</Link></td>
                <td>{d.groupe}</td>
                <td>{fmt.format(d.votes_exprimes)}</td>
                <td>{pct(d.dissidence)}</td>
                <td>{pct(d.delegation)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
