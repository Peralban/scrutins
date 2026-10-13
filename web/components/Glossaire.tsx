"use client";

import { useEffect, useMemo, useState } from "react";
import data from "@/content/glossaire.json";
import s from "./Glossaire.module.css";

type Mot = { id: string; mot: string; cat: string; def: string; site?: string; ex?: string; voir: string[] };
const MOTS = (data.mots as Mot[]).slice().sort((a, b) => a.mot.localeCompare(b.mot, "fr"));
const BY_ID = new Map(MOTS.map((m) => [m.id, m]));
const norm = (t: string) => t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const letter = (m: Mot) => norm(m.mot).replace(/[^a-z0-9]/g, "")[0].toUpperCase();

export default function Glossaire() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Tous");
  // A link to /glossaire#mot opens with that entry visible even if a filter was set.
  useEffect(() => { if (location.hash) { setCat("Tous"); setQ(""); } }, []);
  const list = useMemo(() => MOTS.filter((m) => (cat === "Tous" || m.cat === cat) && (!q || norm(`${m.mot} ${m.def}`).includes(norm(q)))), [q, cat]);
  const letters = new Set(list.map(letter));
  const cats = ["Tous", ...data.categories];

  return (
    <div className={s.layout}>
      <aside className={s.side}>
        <div className={s.label}>Catégories</div>
        <div className={s.cats} role="group" aria-label="Catégories">
          {cats.map((c) => (
            <button key={c} type="button" aria-pressed={c === cat} onClick={() => setCat(c)}>
              {c} <span>{c === "Tous" ? MOTS.length : MOTS.filter((m) => m.cat === c).length}</span>
            </button>
          ))}
        </div>
        <p className={s.note}>Partout sur le site, un mot souligné en pointillé renvoie ici. Les définitions sont relues à la main.</p>
      </aside>
      <div className={s.main}>
        <h1 className="page-title">Glossaire</h1>
        <p className={s.lede}>Les mots de l&apos;Assemblée et ceux du site, expliqués simplement. Pour chacun : ce que ça veut dire, comment le site s&apos;en sert, et un exemple quand ça aide.</p>
        <label className={s.search}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          <span className="sr-only">Chercher un mot</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher un mot : amendement, 49.3, délégation…" />
        </label>
        <nav className={s.letters} aria-label="Aller à la lettre">
          {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((l) => letters.has(l)
            ? <a key={l} href={`#${list.find((m) => letter(m) === l)!.id}`}>{l}</a>
            : <span key={l} aria-hidden="true">{l}</span>)}
        </nav>
        <p className={s.count} aria-live="polite">{list.length} mot{list.length > 1 ? "s" : ""}{cat !== "Tous" ? ` · ${cat}` : ""}{q ? ` · « ${q} »` : ""}</p>
        {list.length === 0 && <p className={s.lede}>Aucun mot ne correspond. Il manque un mot ? Dis-le nous.</p>}
        {list.map((m) => (
          <article key={m.id} id={m.id} className={s.card}>
            <div className={s.body}>
              <div className={s.head}><h2>{m.mot}</h2><span>{m.cat}</span></div>
              <p className={s.def}>{m.def}</p>
              {m.site && <p className={s.site}><b>Sur ce site · </b>{m.site}</p>}
              {m.ex && <p className={s.ex}><i>Exemple :</i> {m.ex}</p>}
            </div>
            {m.voir.length > 0 && (
              <div className={s.voir}>
                <span>voir aussi</span>
                {m.voir.map((v) => BY_ID.get(v)).filter(Boolean).map((v) => (
                  <a key={v!.id} href={`#${v!.id}`} onClick={() => { setCat("Tous"); setQ(""); }}>{v!.mot}</a>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
