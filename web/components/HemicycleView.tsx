"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useApi } from "@/lib/client";
import { NEUTRAL } from "@/lib/format";
import type { HemicycleData, ScrutinItem, ThemesData } from "@/lib/types";
import Hemicycle from "./Hemicycle";
import s from "./HemicycleView.module.css";

const KINDS: [string, string][] = [["", "tous les scrutins"], ["ensemble", "votes sur l'ensemble"], ["amendement", "amendements"], ["article", "articles"], ["motion", "motions et déclarations"]];

export default function HemicycleView() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id");
  const [q, setQ] = useState("");
  const [theme, setTheme] = useState(params.get("theme") ?? "");
  const [kind, setKind] = useState(params.get("kind") ?? "");
  const [debounced, setDebounced] = useState("");
  useEffect(() => { const t = setTimeout(() => setDebounced(q), 200); return () => clearTimeout(t); }, [q]);

  const themes = useApi<ThemesData>("themes").data?.themes ?? [];
  const list = useApi<ScrutinItem[]>(`scrutins?${new URLSearchParams({ q: debounced, theme, kind, limit: "200" })}`).data;
  const current = id ?? list?.[0]?.id ?? null;
  const detail = useApi<HemicycleData>(current ? `scrutin/${current}` : null).data;
  const shown = detail && detail.scrutin.id === current ? detail : undefined;

  const select = (next: string) => router.replace(`/hemicycle?id=${next}`, { scroll: false });

  const tally = useMemo(() => {
    if (!shown) return [];
    const g: Record<string, Record<string, number>> = {};
    for (const x of shown.seats) { (g[x.groupe] ??= { pour: 0, contre: 0, abstention: 0, non_votant: 0, absent: 0 })[x.position]++; }
    return Object.entries(g).sort((a, b) => b[1].pour + b[1].contre + b[1].abstention - (a[1].pour + a[1].contre + a[1].abstention));
  }, [shown]);

  const counts: Record<string, number> = {};
  for (const x of shown?.seats ?? []) counts[x.position] = (counts[x.position] ?? 0) + 1;
  const sc = shown?.scrutin;
  const g = Object.fromEntries((shown?.groupes ?? []).map((x) => [x.id, x]));

  return (
    <div className={s.layout}>
      <div>
        <div className={s.filters}>
          <input type="search" placeholder="rechercher dans l'intitulé" value={q} onChange={(e) => setQ(e.target.value)} />
          <select value={theme} onChange={(e) => setTheme(e.target.value)}>
            <option value="">tous les thèmes</option>
            {themes.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            <option value="_none">non classé</option>
          </select>
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            {KINDS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
        </div>
        <div className={s.list}>
          {list?.length === 0 && <div className={s.item}>aucun scrutin</div>}
          {list?.map((x) => (
            <button key={x.id} className={s.item} aria-current={x.id === current} onClick={() => select(x.id)}>
              {(x.texte ?? x.titre).slice(0, 150)}
              <small>{x.date} · n°{x.numero} · {x.sort} · {x.pour}/{x.contre}/{x.abstentions}{x.etape ? ` · ${x.etape}` : ""}</small>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className={s.head}>{sc ? sc.titre.charAt(0).toUpperCase() + sc.titre.slice(1) : "Choisir un scrutin"}</p>
        {sc && (
          <p className={s.meta}>
            {sc.date} · scrutin n°{sc.numero} · {sc.kind}{sc.etape ? ` · ${sc.etape}` : ""} ·{" "}
            <a href={`https://www.assemblee-nationale.fr/dyn/17/scrutins/${sc.numero}`} target="_blank" rel="noopener noreferrer">fiche sur assemblee-nationale.fr ↗</a>
          </p>
        )}
        <div className="card">{shown ? <Hemicycle data={shown} /> : <p className="skeleton">Chargement…</p>}</div>
        {shown && (
          <>
            <div className={s.legend}>
              <span><i style={{ background: "var(--pour)" }} />pour {counts.pour ?? 0}</span>
              <span><i style={{ background: "var(--contre)" }} />contre {counts.contre ?? 0}</span>
              <span><i style={{ border: "2px solid var(--abst)" }} />abstention {counts.abstention ?? 0}</span>
              <span><i style={{ border: "2px dashed var(--abst)" }} />non-votant {counts.non_votant ?? 0}</span>
              <span><i style={{ border: "2px solid var(--line)" }} />absent {counts.absent ?? 0}</span>
            </div>
            <details open className={s.tally}>
              <summary>décompte par groupe</summary>
              <table>
                <thead><tr><th>Groupe</th><th></th><th>Pour</th><th>Contre</th><th>Abst.</th><th>Absents</th></tr></thead>
                <tbody>
                  {tally.map(([gid, v]) => (
                    <tr key={gid}>
                      <td>{g[gid]?.sigle}</td>
                      <td><i style={{ display: "inline-block", width: 10, height: 10, background: g[gid]?.couleur ?? NEUTRAL }} /></td>
                      <td>{v.pour}</td><td>{v.contre}</td><td>{v.abstention}</td><td>{v.absent}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </>
        )}
      </div>
    </div>
  );
}
