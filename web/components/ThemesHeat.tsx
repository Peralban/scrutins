"use client";

import Link from "next/link";
import { useState } from "react";
import { NEUTRAL, pct, politicalRank } from "@/lib/format";
import type { ThemesData } from "@/lib/types";
import s from "./Heat.module.css";

type Scope = "ensemble" | "tous";

export default function ThemesHeat({ data }: { data: Record<Scope, ThemesData> }) {
  const [scope, setScope] = useState<Scope>("ensemble");
  const [focus, setFocus] = useState<string | null>(null);
  const d = data[scope];
  const gs = [...d.groupes].sort((a, b) => politicalRank(a.sigle) - politicalRank(b.sigle));
  const cell = new Map(d.cells.map((c) => [`${c.theme_id}|${c.groupe_id}`, c]));
  // Phones: one group at a time, its themes as stacked pour/contre/abstention bars.
  const fg = gs.find((g) => g.id === focus) ?? gs[0];
  const profile = fg ? d.themes.map((t) => {
    const c = cell.get(`${t.id}|${fg.id}`);
    const n = c ? c.pour + c.contre + c.abstention : 0;
    return { t, c, n, p: c && n ? (100 * c.pour) / n : -1 };
  }).sort((a, b) => b.p - a.p) : [];

  return (
    <>
      <div className="tools">
        <button aria-pressed={scope === "ensemble"} onClick={() => setScope("ensemble")}>votes sur l&apos;ensemble</button>
        <button aria-pressed={scope === "tous"} onClick={() => setScope("tous")}>tous les scrutins</button>
        <span>{d.themes.length} thèmes · le nombre à droite du thème est son nombre de scrutins</span>
      </div>
      <div className="m-only">
        <div className={s.chips} role="tablist" aria-label="Groupe">
          {gs.map((g) => (
            <button key={g.id} role="tab" aria-selected={g.id === fg?.id} onClick={() => setFocus(g.id)}>
              <i style={{ background: g.couleur ?? NEUTRAL }} />{g.sigle}
            </button>
          ))}
        </div>
        <p className={s.focus}>{fg?.nom} : part de « pour » par thème, du plus favorable au moins favorable.</p>
        <ul className={s.plist}>
          {profile.map(({ t, c, n, p }) => (
            <li key={t.id}>
              <Link href={`/hemicycle?theme=${t.id}&kind=${scope === "ensemble" ? "ensemble" : ""}`}>
                <span className={s.plab}>{t.label}<small>{t.scrutins} scrutins</small></span>
                {c && n >= 30 ? (
                  <>
                    <span className={s.stack} aria-hidden="true">
                      <i style={{ width: `${(100 * c.pour) / n}%`, background: "var(--pour)" }} />
                      <i style={{ width: `${(100 * c.contre) / n}%`, background: "var(--contre)" }} />
                      <i style={{ width: `${(100 * c.abstention) / n}%`, background: "var(--abst)" }} />
                    </span>
                    <b>{p.toFixed(0)} %</b>
                  </>
                ) : <em>trop peu de votes ({n})</em>}
              </Link>
            </li>
          ))}
        </ul>
        <div className={s.scale}>
          <span><i className={s.dot} style={{ background: "var(--pour)" }} />pour</span>
          <span><i className={s.dot} style={{ background: "var(--contre)" }} />contre</span>
          <span><i className={s.dot} style={{ background: "var(--abst)" }} />abstention</span>
        </div>
      </div>
      <div className="d-only">
      <div className={`card ${s.wrap}`}>
        <table className={s.heat}>
          <thead>
            <tr>
              <th>Thème</th>
              {gs.map((g) => (
                <th key={g.id} title={g.nom}>
                  <i style={{ display: "block", height: 3, background: g.couleur ?? NEUTRAL, marginBottom: 4 }} />
                  {g.sigle}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {d.themes.map((t) => (
              <tr key={t.id}>
                <td className={s.lab}>
                  <Link href={`/hemicycle?theme=${t.id}&kind=${scope === "ensemble" ? "ensemble" : ""}`}>{t.label}</Link>
                  <small>{t.scrutins}</small>
                </td>
                {gs.map((g) => {
                  const c = cell.get(`${t.id}|${g.id}`);
                  const n = c ? c.pour + c.contre + c.abstention : 0;
                  if (!c || n < 30) return <td key={g.id} className={s.none} data-tip={`${g.sigle} · ${t.label}\n${n} votes exprimés`}>·</td>;
                  const p = (100 * c.pour) / n;
                  return (
                    <td key={g.id}
                      style={{ background: `color-mix(in srgb, var(--hi) ${p.toFixed(0)}%, var(--lo))`, color: p > 55 ? "#fff" : "var(--ink)" }}
                      data-tip={`${g.sigle} · ${t.label}\npour ${c.pour} · contre ${c.contre} · abst. ${c.abstention}\n${pct(p)} pour`}>
                      {p.toFixed(0)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={s.scale}>
        <span>0 % pour</span><i /><span>100 % pour</span>
        <span style={{ marginLeft: 16 }}>cellule grise : moins de 30 votes exprimés</span>
      </div>
      </div>
    </>
  );
}
