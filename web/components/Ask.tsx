"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useApi } from "@/lib/client";
import { pct } from "@/lib/format";

// Search box + question answering. Everything comes from /api/ask, which answers from SQL and
// fixed templates only: the "Compris comme" line shows how the question was read.
type Hit = { kind: string; ref: string; label: string; sub: string; href: string };
type Ensemble = { id: string; date: string; titre: string; position: string };
type Answer =
  | { intent: "accord"; a: Hit; b: Hit; communs: number; accord: number; taux: number; href: string }
  | { intent: "vote_texte"; depute: Hit; texte: Hit; ensemble: Ensemble[]; details: { total: number; pour: number; contre: number; abstention: number; absent: number }; href: string }
  | { intent: "qui_a_vote"; texte: Hit; position: "pour" | "contre"; scrutin: { id: string; date: string; sort: string; pour: number; contre: number; abstentions: number }; groupes: { sigle: string; couleur: string | null; n: number }[]; href: string }
  | { intent: "notion"; who: Hit; notion: Hit; statut: string; favorables: number; defavorables: number; abstentions: number; part: number | null; verdict: string; href: string };
type AskResult = { q: string; understood: string | null; answer: Answer | null; hits: Hit[] };

const KIND: Record<string, string> = { depute: "Député", groupe: "Groupe", texte: "Texte", notion: "Notion", theme: "Thème", glossaire: "Définition" };
const EXAMPLES = ["Le RN vote-t-il comme LR ?", "Qui a voté contre l'aide à mourir ?", "Comment Bompard a voté sur l'aide à mourir ?", "Le RN est-il pour le nucléaire ?"];
const POS: Record<string, string> = { pour: "pour", contre: "contre", abstention: "abstention", non_votant: "non-votant", absent: "absent" };

export default function Ask() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { const t = setTimeout(() => setDebounced(q.trim()), 180); return () => clearTimeout(t); }, [q]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === "/" && document.activeElement?.tagName !== "INPUT") { e.preventDefault(); input.current?.focus(); } };
    addEventListener("keydown", key); return () => removeEventListener("keydown", key);
  }, []);
  const { data, loading } = useApi<AskResult>(debounced.length >= 2 ? `ask?q=${encodeURIComponent(debounced)}` : null);
  const r = debounced.length >= 2 ? data : undefined;

  return (
    <div className="ask">
      <label className="ask-box">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
        <span className="sr-only">Rechercher ou poser une question</span>
        <input ref={input} type="search" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off"
          placeholder="Pose ta question : un député, un texte, un groupe…" />
        <kbd>/</kbd>
      </label>
      {!r && (
        <div className="ask-examples">
          <span>Essayer :</span>
          {EXAMPLES.map((e) => <button key={e} type="button" onClick={() => setQ(e)}>{e}</button>)}
        </div>
      )}
      {r && (
        <div className="ask-results" aria-live="polite" aria-busy={loading}>
          {r.understood && <p className="ask-understood">Compris comme : <b>{r.understood}</b></p>}
          {r.answer && <AnswerCard a={r.answer} />}
          {r.hits.length > 0 && (
            <ul className="ask-hits">
              {r.hits.slice(0, r.answer ? 4 : 8).map((h) => (
                <li key={h.kind + h.ref}><Link href={h.href}><small>{KIND[h.kind]}</small><b>{h.label}</b><span>{h.sub}</span></Link></li>
              ))}
            </ul>
          )}
          {!r.answer && r.hits.length === 0 && <p className="ask-understood">Aucun résultat. Essaie un nom de député, un sigle de groupe ou quelques mots d&apos;un texte.</p>}
        </div>
      )}
    </div>
  );
}

function AnswerCard({ a }: { a: Answer }) {
  if (a.intent === "accord") return (
    <div className="ask-answer">
      <p><b>{a.a.label}</b> et <b>{a.b.label}</b> ont eu la même position majoritaire sur <b>{pct(a.taux)}</b> des votes sur l&apos;ensemble d&apos;un texte ({a.accord} sur {a.communs}).</p>
      <Link href={a.href}>Tous les accords de {a.a.label} →</Link>
    </div>
  );
  if (a.intent === "notion") {
    const direct = a.statut === "données directes";
    // A group's figures are its members' votes added up, not one vote per scrutin.
    const sujet = a.who.kind === "groupe" ? <>les députés <b>{a.who.label}</b> ont</> : <><b>{a.who.label}</b> a</>;
    const unite = a.who.kind === "groupe" ? "votes" : "fois";
    return (
      <div className="ask-answer">
        {direct
          ? <p>{sujet} voté <b>{a.favorables}</b> {unite} pour une motion de censure (seuls les votes « pour » sont enregistrés).</p>
          : <p>Sur les amendements retenus pour la notion « {a.notion.label} », {sujet} voté dans le sens favorable <b>{a.favorables}</b> {unite} et défavorable <b>{a.defavorables}</b> {unite}
              {a.part != null && <> ({pct(a.part)} favorable)</>} : <b className={a.verdict === "plutôt favorable" ? "pos-pour" : a.verdict === "plutôt défavorable" ? "pos-contre" : "pos-absent"}>{a.verdict}</b>.</p>}
        {!direct && <p className="ask-detail">Étiquettes en cours de validation. Voter contre un amendement n&apos;est pas toujours voter contre la notion : chaque amendement et son sens sont listés sur la page.</p>}
        <Link href={a.href}>Détail de la notion →</Link>
      </div>
    );
  }
  if (a.intent === "qui_a_vote") {
    const s = a.scrutin, n = a.position === "pour" ? s.pour : s.contre;
    return (
      <div className="ask-answer">
        <p><b>{n} députés</b> ont voté {a.position} l&apos;ensemble du texte le {s.date} ({s.sort} : {s.pour} pour, {s.contre} contre, {s.abstentions} abst.).</p>
        <div className="ask-groups">{a.groupes.map((g) => <span key={g.sigle}><i style={{ background: g.couleur ?? "var(--muted)" }} />{g.sigle} {g.n}</span>)}</div>
        <Link href={a.href}>Voir l&apos;hémicycle et les noms →</Link>
      </div>
    );
  }
  const d = a.details;
  return (
    <div className="ask-answer">
      {a.ensemble.length > 0 ? (
        <ul className="ask-ensemble">
          {a.ensemble.map((e) => <li key={e.id}><span>{e.date}</span> <b className={`pos-${e.position}`}>{POS[e.position] ?? e.position}</b> <Link href={`/hemicycle?id=${e.id}`}>vote sur l&apos;ensemble</Link></li>)}
        </ul>
      ) : <p>Pas de vote public sur l&apos;ensemble de ce texte.</p>}
      {d.total > 0 && <p className="ask-detail">Sur les {d.total} autres scrutins du texte (amendements, articles) : {d.pour} pour, {d.contre} contre, {d.abstention} abst., absent {d.absent} fois. Un « contre » sur un amendement n&apos;est pas un vote contre le texte.</p>}
      <Link href={a.href}>Page de {a.depute.label} →</Link>
    </div>
  );
}
