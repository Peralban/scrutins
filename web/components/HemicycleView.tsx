"use client";

import { trouver } from "glossaire-politique";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useApi } from "@/lib/client";
import { fmt, politicalRank } from "@/lib/format";
import { etiquette } from "@/lib/palette";
import type { HemicycleData, ScrutinItem, ThemesData } from "@/lib/types";
import { auteur, consequence, dateLongue, majorite, motion, shortText, verdict, what } from "@/lib/vote";
import Hemicycle from "./Hemicycle";
import s from "./HemicycleView.module.css";

const KINDS: [string, string][] = [["", "Tout"], ["ensemble", "Textes entiers"], ["amendement", "Amendements"], ["article", "Articles"], ["motion", "Motions"]];
const AN = "https://www.assemblee-nationale.fr";
const capFirst = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const sansAuteur = (t: string) => t.replace(/,? déposée? par .*$/, "");

export default function HemicycleView() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id");
  const [q, setQ] = useState("");
  // Phones: the scrutin list is a full-screen sheet opened on demand, so the vote comes first.
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
  // The list reads by sitting day, then by text: consecutive votes on the same text sit under one heading.
  const days = useMemo(() => {
    const out: { date: string; texts: { key: string; items: ScrutinItem[] }[] }[] = [];
    for (const x of list ?? []) {
      let day = out[out.length - 1];
      if (!day || day.date !== x.date) out.push((day = { date: x.date, texts: [] }));
      const key = x.texte ?? x.titre, last = day.texts[day.texts.length - 1];
      if (last && last.key === key) last.items.push(x); else day.texts.push({ key, items: [x] });
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

  return (
    <div className={s.layout}>
      <div className={s.picker} data-open={picking}>
        <div className={s.sheetHead}>
          <span>Choisir un vote</span>
          <button type="button" onClick={() => setPicking(false)}>Fermer</button>
        </div>
        <div className={s.filters}>
          <label className={s.search}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
            <span className="sr-only">Rechercher dans l&apos;intitulé</span>
            <input type="search" placeholder="Rechercher un texte, un député…" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <div className={s.chips} role="group" aria-label="Type de vote">
            {KINDS.map(([k, label]) => <button key={k} type="button" aria-pressed={kind === k} onClick={() => setParam("kind", k)}>{label}</button>)}
          </div>
          <select value={theme} onChange={(e) => setParam("theme", e.target.value)} aria-label="Thème">
            <option value="">Tous les thèmes</option>
            {themes.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            <option value="_none">Non classé</option>
          </select>
        </div>
        <div className={s.list}>
          {list?.length === 0 && <p className={s.empty}>Aucun vote ne correspond.</p>}
          {days.map((d) => (
            <section key={d.date} aria-label={dateLongue(d.date)}>
              <h3 className={s.day}>{dateLongue(d.date)}</h3>
              {d.texts.map((t, i) => (
                <div key={`${i}:${t.key}`} className={s.text}>
                  {t.items.length > 1 && <p className={s.textHead}>{shortText(t.key)}</p>}
                  {t.items.map((x) => (
                    <button key={x.id} type="button" className={s.item} aria-current={x.id === current} onClick={() => select(x.id)}>
                      <span className={s.itemTop}>
                        <span className={s.itemTitle}>{t.items.length > 1 ? sansAuteur(what(x.titre)) : shortText(x.texte ?? x.titre)}</span>
                        <b className={x.sort === "adopté" ? s.ok : s.ko}>{capFirst(verdict(x).split(" ").pop()!)}</b>
                      </span>
                      {t.items.length === 1 && x.texte && <span className={s.itemWhat}>{sansAuteur(what(x.titre))}</span>}
                      <VoteBar pour={x.pour} contre={x.contre} abst={x.abstentions} thin />
                      <span className={s.itemCount}>{x.pour} pour · {x.contre} contre · {x.abstentions} abst.</span>
                    </button>
                  ))}
                </div>
              ))}
            </section>
          ))}
        </div>
      </div>

      <div className={s.main}>
        <button type="button" className={s.change} onClick={() => setPicking(true)}>
          <span>Tous les votes</span>
          <small>{list ? `${list.length}${list.length === 200 ? "+" : ""}` : "…"}{theme || kind ? " · filtres" : ""}</small>
        </button>
        {shown ? <Vote data={shown} /> : <p className="skeleton">Chargement du vote…</p>}
      </div>
    </div>
  );
}

function VoteBar({ pour, contre, abst, thin = false }: { pour: number; contre: number; abst: number; thin?: boolean }) {
  const t = pour + contre + abst || 1;
  return (
    <span className={thin ? `${s.bar} ${s.thin}` : s.bar} aria-hidden="true">
      {pour > 0 && <i style={{ width: `${(100 * pour) / t}%`, background: "var(--pour)" }} />}
      {contre > 0 && <i style={{ width: `${(100 * contre) / t}%`, background: "var(--contre)" }} />}
      {abst > 0 && <i style={{ width: `${(100 * abst) / t}%`, background: "var(--abst)" }} />}
    </span>
  );
}

function Vote({ data }: { data: HemicycleData }) {
  const sc = data.scrutin;
  const [voters, setVoters] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [sc.id]);

  const counts: Record<string, number> = {};
  for (const x of data.seats) counts[x.position] = (counts[x.position] ?? 0) + 1;
  const sigle = Object.fromEntries(data.groupes.map((g) => [g.id, g.sigle]));
  const a = data.vote.amendement;
  // The author: the amendment's signatory, else the deputy named in the title ("déposée par M. X"), with the group they sat in.
  const nomAuteur = a?.auteur ?? auteur(sc.titre);
  const groupeAuteur = a ? a.groupe : sigle[data.seats.find((x) => x.nom === nomAuteur)?.groupe ?? ""];
  const parAuteur = nomAuteur ? `${nomAuteur}${groupeAuteur ? ` (${groupeAuteur})` : ""}` : null;
  const titre = sansAuteur(what(sc.titre));
  const v = verdict(sc), suite = consequence(sc), maj = majorite(sc);
  const m = motion(sc.titre), def = m ? trouver(m) : undefined;
  const nv = counts.non_votant ?? 0;

  return (
    <article className={s.vote}>
      <header className={s.head}>
        {sc.texte && <p className="eyebrow">{shortText(sc.texte)}{sc.etape ? ` · ${sc.etape}` : ""}</p>}
        <h1 className={s.title}>{titre}</h1>
        <p className={s.sub}>{parAuteur && <>{a ? "Par" : "Déposée par"} {parAuteur} · </>}{dateLongue(sc.date)} · scrutin n° {sc.numero}</p>
      </header>

      <section className={s.verdict} aria-label="Résultat">
        <div className={s.verdictTop}>
          <h2 className={s.verdictLabel}>{v}</h2>
          {maj && <span className={s.small}>{maj}</span>}
        </div>
        <VoteBar pour={sc.pour} contre={sc.contre} abst={sc.abstentions} />
        <div className={s.verdictCounts}>
          <span className={s.pour}>{fmt.format(sc.pour)} pour</span>
          {sc.abstentions > 0 && <span className={s.abst}>{fmt.format(sc.abstentions)} abstention{sc.abstentions > 1 ? "s" : ""}</span>}
          <span className={s.contre}>{fmt.format(sc.contre)} contre</span>
        </div>
        <p className={s.stats}>
          <span>{fmt.format(sc.votants)} votants</span>
          <span>{nv} non-votant{nv > 1 ? "s" : ""}</span>
          <span>{counts.absent ?? 0} absents</span>
        </p>
        <div className={s.what}>
          <span className={s.label}>Ce qui est voté</span>
          <p>
            {titre}{parAuteur && !a ? `, déposée par ${parAuteur}` : ""}.
            {suite && <> {capFirst(v.split(" ").pop()!)} : {suite}</>}
          </p>
          <button type="button" className={s.toggle} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? "Masquer les détails ▴" : "Afficher les détails ▾"}
          </button>
          {open && (
            <div className={s.details}>
              {a ? (
                <>
                  {a.dispositif ? <><h3>Ce que l&apos;amendement change</h3><blockquote>{a.dispositif}</blockquote></> : <p className={s.small}>Le texte de l&apos;amendement n&apos;est pas dans les données.</p>}
                  {a.expose && <><h3>Exposé des motifs, l&apos;argumentaire de l&apos;auteur</h3><p className={s.expose}>{a.expose}</p></>}
                </>
              ) : def ? (
                <>
                  <h3>{def.mot}</h3>
                  <p>{def.def}</p>
                </>
              ) : (
                <p className={s.small}>Le contenu de ce vote est sur les pages officielles ci-dessous.</p>
              )}
              <ul className={s.liens}>
                {def && <li><Link href={`/glossaire#${def.id}`}>La définition dans le glossaire</Link></li>}
                {data.vote.liens.map((l) => <li key={l.url}><a href={l.url} target="_blank" rel="noopener noreferrer">{capFirst(l.label)} sur assemblee-nationale.fr ↗</a></li>)}
                <li><a href={`${AN}/dyn/17/scrutins/${sc.numero}`} target="_blank" rel="noopener noreferrer">La fiche du scrutin n° {sc.numero} ↗</a></li>
              </ul>
              <p className={s.small}>Libellé officiel : « {sc.titre} »</p>
            </div>
          )}
        </div>
      </section>

      <section className={s.card} aria-label="Qui a voté quoi">
        <div className={s.cardHead}>
          <h2>Qui a voté quoi</h2>
          <div className={s.segment} role="group" aria-label="Sièges affichés">
            <button type="button" aria-pressed={!voters} onClick={() => setVoters(false)}>Tous les sièges</button>
            <button type="button" aria-pressed={voters} onClick={() => setVoters(true)}>Votants seulement</button>
          </div>
        </div>
        <Hemicycle data={data} voters={voters} />
        <div className={s.legend}>
          <span><i style={{ background: "var(--pour)" }} />pour</span>
          <span><i style={{ background: "var(--contre)" }} />contre</span>
          <span><i style={{ border: "2px solid var(--abst)" }} />abstention</span>
          <span><i style={{ border: "2px dashed var(--abst)" }} />non-votant</span>
          <span><i className={s.absentDot} />absent</span>
        </div>
        <p className={s.small}>Un point par siège, à sa place réelle. Survolez un point pour voir le député, cliquez pour ouvrir sa fiche.</p>
      </section>

      <ParGroupe data={data} />
    </article>
  );
}

// One bar per group, in the chamber's left-to-right order, its length the group's size: pour, contre,
// abstentions, then non-votants and absents in pale grey.
const SEG: [string, string, string][] = [["pour", "var(--pour)", "pour"], ["contre", "var(--contre)", "contre"], ["abstention", "var(--abst)", "abst."], ["non_votant", "var(--line)", "non-votant"], ["absent", "var(--grid)", "abs."]];
function ParGroupe({ data }: { data: HemicycleData }) {
  const rows = useMemo(() => {
    const g: Record<string, Record<string, number>> = {};
    for (const x of data.seats) (g[x.groupe] ??= { pour: 0, contre: 0, abstention: 0, non_votant: 0, absent: 0 })[x.position]++;
    const byId = Object.fromEntries(data.groupes.map((x) => [x.id, x]));
    return Object.entries(g).map(([id, c]) => ({ id, sigle: byId[id]?.sigle ?? "?", nom: byId[id]?.nom ?? "", c, total: Object.values(c).reduce((x, y) => x + y, 0) }))
      .sort((x, y) => politicalRank(x.sigle) - politicalRank(y.sigle));
  }, [data]);
  const max = Math.max(...rows.map((r) => r.total), 1);
  const decompte = (c: Record<string, number>) => SEG.filter(([k]) => c[k]).map(([k, , l]) => `${c[k]} ${l}`).join(" · ");
  return (
    <section className={s.groupes} aria-label="Par groupe">
      <h2>Par groupe</h2>
      <p className={s.small}>Chaque barre a la longueur du groupe : votes pour, contre et abstentions, puis non-votants et absents en gris clair.</p>
      {rows.map((r) => (
        <div key={r.id} className={s.gRow}>
          <span className={s.gName}><span className="etiquette" style={etiquette(r.sigle)}>{r.sigle}</span><small>{r.nom}</small></span>
          <span className={s.gTrack}>
            <span className={s.gBar} style={{ width: `${(100 * r.total) / max}%` }}>
              {SEG.map(([k, col]) => r.c[k] > 0 && <i key={k} style={{ flexGrow: r.c[k], background: col }} />)}
            </span>
          </span>
          <span className={s.gCount}>{decompte(r.c)}</span>
        </div>
      ))}
    </section>
  );
}
