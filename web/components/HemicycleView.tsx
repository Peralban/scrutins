"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useApi } from "@/lib/client";
import { NEUTRAL, fmt } from "@/lib/format";
import type { HemicycleData, ScrutinItem, ThemesData } from "@/lib/types";
import Hemicycle from "./Hemicycle";
import s from "./HemicycleView.module.css";

const BILL = /^(proposition|projet) de (loi|résolution)( organique| constitutionnelle| européenne)?\s+((visant|tendant|relative?|portant|pour|sur|autorisant)\S*\s+)?(à |au |aux |l[’']|la |le |les |de |du |des )?/i;
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const shortText = (t: string) => cap(t.replace(BILL, "").replace(/\.$/, ""));
// "l'amendement n° 12 de M. Ramos à l'article premier de la proposition de loi …" -> "Amendement n° 12 de M. Ramos à l'article premier".
function voteLabel(titre: string) {
  const head = titre.split(/\s+(?:de la|du|de cette) (?:proposition|projet)\b/i)[0].replace(/\.$/, "").trim();
  return /^l[’']ensemble$/i.test(head) ? "Vote sur l'ensemble" : cap(head.replace(/^(l[’']|le |la |les )/i, ""));
}

const KINDS: [string, string][] = [["", "tous les scrutins"], ["ensemble", "votes sur l'ensemble"], ["amendement", "amendements"], ["article", "articles"], ["motion", "motions et déclarations"]];

export default function HemicycleView() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id");
  const [q, setQ] = useState("");
  // Phones: the scrutin list is a full-screen sheet opened on demand, so the hemicycle comes first.
  const [picking, setPicking] = useState(false);
  useEffect(() => {
    document.body.style.overflow = picking ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [picking]);
  // Next keeps a page's state when you navigate away, so the filters live in the URL, not in state.
  const theme = params.get("theme") ?? "";
  const kind = params.get("kind") ?? "";
  const setParam = (key: "theme" | "kind", value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value); else next.delete(key);
    router.replace(`/hemicycle?${next}`, { scroll: false });
  };
  const [debounced, setDebounced] = useState("");
  useEffect(() => { const t = setTimeout(() => setDebounced(q), 200); return () => clearTimeout(t); }, [q]);

  const themes = useApi<ThemesData>("themes").data?.themes ?? [];
  const list = useApi<ScrutinItem[]>(`scrutins?${new URLSearchParams({ q: debounced, theme, kind, limit: "200" })}`).data;
  const current = id ?? list?.[0]?.id ?? null;
  // Consecutive scrutins of the same text are grouped under one heading, each labelled by what was voted.
  const groups = useMemo(() => {
    const out: { key: string; items: ScrutinItem[] }[] = [];
    for (const x of list ?? []) {
      const key = x.texte ?? x.titre, last = out[out.length - 1];
      if (last && last.key === key) last.items.push(x); else out.push({ key, items: [x] });
    }
    return out;
  }, [list]);
  const detail = useApi<HemicycleData>(current ? `scrutin/${current}` : null).data;
  const shown = detail && detail.scrutin.id === current ? detail : undefined;

  const select = (scrutin: string) => {
    const next = new URLSearchParams(params.toString());
    next.set("id", scrutin);
    router.replace(`/hemicycle?${next}`, { scroll: false });
    setPicking(false);
  };

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
      <div className={s.picker} data-open={picking}>
        <div className={s.sheetHead}>
          <span>Choisir un scrutin</span>
          <button type="button" onClick={() => setPicking(false)} aria-label="Fermer">Fermer</button>
        </div>
        <div className={s.filters}>
          <input type="search" placeholder="rechercher dans l'intitulé" value={q} onChange={(e) => setQ(e.target.value)} />
          <select value={theme} onChange={(e) => setParam("theme", e.target.value)}>
            <option value="">tous les thèmes</option>
            {themes.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            <option value="_none">non classé</option>
          </select>
          <select value={kind} onChange={(e) => setParam("kind", e.target.value)}>
            {KINDS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
        </div>
        <div className={s.list}>
          {list?.length === 0 && <div className={s.item}>aucun scrutin</div>}
          {groups.map((g, i) => (
            <div key={`${i}:${g.key}`} className={s.group}>
              {g.items.length > 1 && <div className={s.gHead}><span>{shortText(g.key)}</span><small>{g.items.length} votes</small></div>}
              {g.items.map((x) => (
                <button key={x.id} className={s.item} aria-current={x.id === current} onClick={() => select(x.id)}>
                  <span className={s.what}>{g.items.length > 1 ? voteLabel(x.titre) : shortText(x.texte ?? x.titre)}</span>
                  <small><b className={x.sort === "adopté" ? s.adopte : s.rejete}>{x.sort}</b> · {x.pour}/{x.contre}/{x.abstentions} · {x.date} · n°{x.numero}{x.etape ? ` · ${x.etape}` : ""}</small>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div>
        <button type="button" className={s.change} onClick={() => setPicking(true)}>
          <span>Changer de scrutin</span>
          <small>{list ? `${list.length}${list.length === 200 ? "+" : ""} résultats` : "…"}{theme || kind ? " · filtres actifs" : ""}</small>
        </button>
        <p className={s.head}>{sc ? sc.titre.charAt(0).toUpperCase() + sc.titre.slice(1) : "Choisir un scrutin"}</p>
        {sc && (
          <p className={s.meta}>
            {sc.date} · scrutin n°{sc.numero} · {sc.kind}{sc.etape ? ` · ${sc.etape}` : ""} · {fmt.format(sc.pour + sc.contre)} suffrages exprimés ·{" "}
            <a href={`https://www.assemblee-nationale.fr/dyn/17/scrutins/${sc.numero}`} target="_blank" rel="noopener noreferrer">fiche sur assemblee-nationale.fr ↗</a>
          </p>
        )}
        <div className="card">{shown ? <Hemicycle data={shown} /> : <p className="skeleton">Chargement…</p>}</div>
        {shown && <CeQuiEstVote v={shown.vote} />}
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

// The text behind the vote, as published: the amendment's change and its author's explanation,
// plus the official pages. Nothing rewritten.
function CeQuiEstVote({ v }: { v: HemicycleData["vote"] }) {
  const a = v.amendement;
  return (
    <section className={s.texte} aria-label="Ce qui est voté">
      <h2>Ce qui est voté</h2>
      {a ? (
        <>
          <p className={s.meta}>Amendement n° {a.numero}{a.auteur ? ` · ${a.auteur}${a.groupe ? ` (${a.groupe})` : ""}` : ""}</p>
          {a.dispositif ? <><h3>Ce que l&apos;amendement change</h3><blockquote>{a.dispositif}</blockquote></> : <p className={s.meta}>Le texte de l&apos;amendement n&apos;est pas dans les données.</p>}
          {a.expose && (
            <details>
              <summary>Exposé des motifs, l&apos;argumentaire de l&apos;auteur</summary>
              <p className={s.expose}>{a.expose}</p>
            </details>
          )}
        </>
      ) : (
        <p className={s.meta}>Ce vote porte sur un article ou sur un texte entier : son contenu est sur les pages officielles ci-dessous.</p>
      )}
      {v.liens.length > 0 && (
        <ul className={s.liens}>
          {v.liens.map((l) => <li key={l.url}><a href={l.url} target="_blank" rel="noopener noreferrer">{l.label} sur assemblee-nationale.fr ↗</a></li>)}
        </ul>
      )}
    </section>
  );
}
