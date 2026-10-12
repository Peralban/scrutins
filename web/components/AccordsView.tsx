"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useId, useMemo, useState } from "react";
import { useApi } from "@/lib/client";
import { NEUTRAL, pct, politicalRank } from "@/lib/format";
import type { AccordCell, AccordDepute, AccordDuo, DeputeRow, GroupeStat, ThemesData, Voisin } from "@/lib/types";
import heat from "./Heat.module.css";
import s from "./Accords.module.css";

type Scope = "ensemble" | "tous";

export default function AccordsView({ deputes }: { deputes: DeputeRow[] }) {
  return (
    <>
      <GroupMatrix />
      <Neighbours deputes={deputes} />
    </>
  );
}

function GroupMatrix() {
  const [scope, setScope] = useState<Scope>("ensemble");
  const [theme, setTheme] = useState("");
  const themes = useApi<ThemesData>("themes").data?.themes ?? [];
  const cells = useApi<AccordCell[]>(`accords/groupes?scope=${scope}&theme=${theme}`).data;
  const groupes = useApi<GroupeStat[]>("groupes").data;

  const g = useMemo(() => {
    if (!cells || !groupes) return [];
    return groupes
      .filter((x) => cells.some((r) => r.a === x.id && r.b !== x.id && r.communs >= 10))
      .sort((a, b) => politicalRank(a.sigle) - politicalRank(b.sigle));
  }, [cells, groupes]);
  const cell = new Map((cells ?? []).map((r) => [`${r.a}|${r.b}`, r]));

  return (
    <section>
      <h2>Accord entre groupes</h2>
      <p className="def">Part des scrutins sur lesquels deux groupes ont la même position majoritaire (pour, contre ou abstention). Les scrutins où un groupe n&apos;a pas de majorité nette sont exclus pour ce groupe.</p>
      <div className="tools">
        <button aria-pressed={scope === "ensemble"} onClick={() => setScope("ensemble")}>votes sur l&apos;ensemble</button>
        <button aria-pressed={scope === "tous"} onClick={() => setScope("tous")}>tous les scrutins</button>
        <select value={theme} onChange={(e) => setTheme(e.target.value)}>
          <option value="">tous les thèmes</option>
          {themes.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <span>{g.length} groupes</span>
      </div>
      <div className={`card ${heat.wrap}`}>
        <table className={heat.heat} style={{ minWidth: 640 }}>
          <thead>
            <tr><th />{g.map((x) => <th key={x.id} title={x.nom}><i style={{ display: "block", height: 3, background: x.couleur ?? NEUTRAL, marginBottom: 4 }} />{x.sigle}</th>)}</tr>
          </thead>
          <tbody>
            {g.map((a) => (
              <tr key={a.id}>
                <th className={heat.row} title={a.nom}><span style={{ display: "inline-block", width: 10, height: 10, background: a.couleur ?? NEUTRAL, marginRight: 6 }} />{a.sigle}</th>
                {g.map((b) => {
                  if (a.id === b.id) return <td key={b.id} className={heat.none}>—</td>;
                  const c = cell.get(`${a.id}|${b.id}`);
                  if (!c || c.communs < 10) return <td key={b.id} className={heat.none} data-tip={`${a.sigle} · ${b.sigle}\n${c?.communs ?? 0} scrutins en commun`}>·</td>;
                  const p = (100 * c.accord) / c.communs;
                  return (
                    <td key={b.id} data-tip={`${a.sigle} · ${b.sigle}\n${c.accord} accords sur ${c.communs} scrutins\n${pct(p)}`}
                      style={{ background: `color-mix(in srgb, var(--hi) ${p.toFixed(0)}%, var(--lo))`, color: p > 55 ? "#fff" : "var(--ink)" }}>{p.toFixed(0)}</td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={heat.scale}><span>0 % d&apos;accord</span><i /><span>100 %</span><span style={{ marginLeft: 16 }}>cellule grise : moins de 10 scrutins en commun</span></div>
    </section>
  );
}

function NeighbourTable({ list, onPick }: { list: Voisin[]; onPick: (id: string) => void }) {
  return (
    <div className="scroll">
      <table>
        <thead><tr><th>Député</th><th>Groupe</th><th>Accord</th><th>Communs</th></tr></thead>
        <tbody>
          {list.map((r) => (
            <tr key={r.id} className={s.pick} onClick={() => onPick(r.id)}>
              <td className={s.t}>{r.nom}</td><td>{r.groupe}</td><td>{pct(r.taux)}</td><td>{r.communs}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Neighbours({ deputes }: { deputes: DeputeRow[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const a = params.get("depute"), b = params.get("b");
  const [hors, setHors] = useState(false);
  const [kind, setKind] = useState("");
  const names = useId();
  const byName = new Map(deputes.map((d) => [d.nom, d.id]));
  const nameOf = (id: string | null) => deputes.find((d) => d.id === id)?.nom ?? "";

  const set = (key: "depute" | "b", id: string) => {
    const u = new URLSearchParams(params.toString());
    u.set(key, id);
    router.replace(`/accords?${u}`, { scroll: false });
  };

  const near = useApi<AccordDepute>(a ? `accords/depute/${a}?hors=${hors ? 1 : 0}&kind=${kind}&min=100` : null).data;
  const duo = useApi<AccordDuo>(a && b ? `accords/duo/${a}/${b}?kind=${kind}` : null).data;

  return (
    <>
      <section>
        <h2>Qui vote comme un député</h2>
        <p className="def">Accord sur les scrutins où les deux députés ont exprimé une position (pour, contre, abstention). Minimum 100 scrutins en commun.</p>
        <div className="tools">
          <input key={a} className={s.search} type="search" list={names} placeholder="député" autoComplete="off" defaultValue={nameOf(a)}
            onChange={(e) => { const id = byName.get(e.target.value); if (id) set("depute", id); }} />
          <datalist id={names}>{deputes.map((d) => <option key={d.id} value={d.nom} />)}</datalist>
          <button aria-pressed={!hors} onClick={() => setHors(false)}>tous les groupes</button>
          <button aria-pressed={hors} onClick={() => setHors(true)}>hors de son groupe</button>
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="">tous les scrutins</option><option value="ensemble">votes sur l&apos;ensemble</option><option value="amendement">amendements</option>
          </select>
        </div>
        {!a && <p className="def">Choisir un député.</p>}
        {a && near && (near.candidats ? (
          <div className={s.two}>
            <div><h3>Votent le plus comme lui ({near.candidats} comparables)</h3><NeighbourTable list={near.proches} onPick={(id) => set("b", id)} /></div>
            <div><h3>Votent le moins comme lui</h3><NeighbourTable list={near.eloignes} onPick={(id) => set("b", id)} /></div>
          </div>
        ) : <p className="def">Pas assez de scrutins en commun (minimum 100).</p>)}
        {a && <p className="def"><Link href={`/depute/${a}`}>page de {nameOf(a)} →</Link></p>}
      </section>

      <section>
        <h2>Deux députés</h2>
        <div className="tools">
          <span>{nameOf(a) || "—"}</span> <b>↔</b>
          <input key={b} className={s.search} type="search" list={names} placeholder="second député" autoComplete="off" defaultValue={nameOf(b)}
            onChange={(e) => { const id = byName.get(e.target.value); if (id) set("b", id); }} />
        </div>
        {duo && <Duo duo={duo} />}
      </section>
      <footer>Un accord élevé entre deux députés du même groupe est attendu ; l&apos;option « hors de son groupe » isole les rapprochements qui ne s&apos;expliquent pas par la discipline de groupe.</footer>
    </>
  );
}

function Duo({ duo }: { duo: AccordDuo }) {
  const p = duo.communs ? (100 * duo.accord) / duo.communs : null;
  return (
    <>
      <div className="kpis">
        <div className="kpi"><b>{duo.communs}</b><span>scrutins en commun</span></div>
        <div className="kpi"><b>{p == null ? "—" : pct(p)}</b><span>accord</span></div>
        <div className="kpi"><b>{duo.total_desaccords}</b><span>désaccords</span></div>
      </div>
      <div className="scroll">
        <table>
          <thead><tr><th>Date</th><th>Scrutin</th><th>{duo.a.nom}</th><th>{duo.b.nom}</th></tr></thead>
          <tbody>
            {duo.desaccords.map((d) => (
              <tr key={d.id}>
                <td>{d.date}</td>
                <td className={s.t}><Link href={`/hemicycle?id=${d.id}`}>{d.titre.slice(0, 170)}</Link></td>
                <td className={d.pa === "pour" ? s.pour : s.contre}>{d.pa}</td>
                <td className={d.pb === "pour" ? s.pour : s.contre}>{d.pb}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {duo.total_desaccords > 200 && <p className="def">200 plus récents sur {duo.total_desaccords}.</p>}
    </>
  );
}
