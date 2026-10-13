// Internal search and question engine. No model, no generated prose: every answer is a
// SQL query and a fixed template, so the same question always gives the same, checkable answer.
//
// Two layers:
//   1. search(): typed entity lookup (deputies, groups, texts, notions, themes) over an FTS5
//      index built at ingest, with a trigram index as a typo-tolerant fallback.
//   2. ask(): recognises a few question shapes ("X vote comme Y", "qui a voté contre T",
//      "comment X a voté sur T") from the entities found in the question plus keyword cues,
//      and answers them from the database. Anything else falls back to the search results.
import type { Database } from "bun:sqlite";
import { glossaire } from "./glossaire";

export type Kind = "depute" | "groupe" | "texte" | "notion" | "theme" | "glossaire";
export type Hit = { kind: Kind; ref: string; label: string; sub: string; href: string; score: number };

// Prefix lists that make every bill title start the same way; dropped from labels and from matching.
const BILL = /^(proposition|projet) de (loi|résolution)( organique| constitutionnelle| européenne)?\s+((visant|tendant|relative?|portant|pour|sur|autorisant|d[’'])\S*\s+)?(à |a |au |aux |l[’']|la |le |les |de |du |des )?/i;
export const texteKey = (t: string) => t.replace(/[’‘]/g, "'").replace(/\s*\([^()]*\)\s*$/, "").replace(/\s+/g, " ").trim().toLowerCase();
const shortTitle = (t: string) => { const s = t.replace(BILL, ""); return s.charAt(0).toUpperCase() + s.slice(1); };

// Extra names people type for groups, beyond sigle and official name.
const GROUP_ALIASES: Record<string, string> = {
  "LFI-NFP": "lfi insoumis insoumise melenchon nfp", RN: "rassemblement national le pen bardella fn",
  EPR: "renaissance ensemble macronistes macron", SOC: "ps socialistes parti socialiste",
  DR: "lr les republicains republicains wauquiez droite", ECOS: "ecologistes eelv verts",
  DEM: "modem democrates bayrou", HOR: "horizons philippe", LIOT: "liot independants outre mer territoires",
  GDR: "communistes pcf gauche democrate", UDR: "ciotti union des droites", UDDPLR: "ciotti union des droites", NI: "non inscrits",
};
const BOOST: Record<Kind, number> = { groupe: 3, depute: 2, glossaire: 1.8, notion: 1.6, theme: 1.2, texte: 1 };

export function buildSearchIndex(db: Database) {
  db.exec(`
    CREATE VIRTUAL TABLE search USING fts5(kind UNINDEXED, ref UNINDEXED, label, sub UNINDEXED, href UNINDEXED, body, weight UNINDEXED,
      tokenize = "unicode61 remove_diacritics 2", prefix = '2 3');
    CREATE VIRTUAL TABLE search_tri USING fts5(kind UNINDEXED, ref UNINDEXED, label, tokenize = "trigram remove_diacritics 1");
  `);
  const ins = db.prepare(`INSERT INTO search (kind, ref, label, sub, href, body, weight) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  const tri = db.prepare(`INSERT INTO search_tri (kind, ref, label) VALUES (?, ?, ?)`);
  const add = (kind: Kind, ref: string, label: string, sub: string, href: string, body: string, weight: number) => {
    ins.run(kind, ref, label, sub, href, body, weight); tri.run(kind, ref, label);
  };
  db.transaction(() => {
    for (const d of db.query(`SELECT d.id, d.prenom, d.nom, s.groupe, s.votes_exprimes FROM depute d LEFT JOIN stat_depute s ON s.id = d.id`).all() as any[])
      add("depute", d.id, `${d.prenom} ${d.nom}`, `${d.groupe ?? "—"} · ${d.votes_exprimes ?? 0} votes exprimés`, `/depute/${d.id}`, d.nom, Math.log10(10 + (d.votes_exprimes ?? 0)));
    for (const g of db.query(`SELECT id, sigle, nom FROM groupe WHERE id != 'PO847173'`).all() as any[])
      add("groupe", g.id, g.sigle, g.nom, `/groupes/${g.id}`, `${g.nom} ${GROUP_ALIASES[g.sigle] ?? ""}`, 3);
    // The same bill appears under several spellings (curly vs straight apostrophe, "(seconde délibération)"):
    // one entry per normalised title, and texte_key maps it back to every spelling.
    db.exec(`CREATE TABLE texte_key (key TEXT NOT NULL, texte TEXT NOT NULL)`);
    const keys = new Map<string, { texte: string; n: number; d: string }>();
    const tk = db.prepare(`INSERT INTO texte_key (key, texte) VALUES (?, ?)`);
    for (const t of db.query(`SELECT texte, COUNT(*) n, MAX(date) d FROM scrutin WHERE texte IS NOT NULL GROUP BY texte`).all() as any[]) {
      const key = texteKey(t.texte);
      tk.run(key, t.texte);
      const k = keys.get(key);
      if (!k) keys.set(key, { texte: t.texte, n: t.n, d: t.d });
      else { k.n += t.n; if (t.d > k.d) k.d = t.d; if (t.texte.length < k.texte.length) k.texte = t.texte; }
    }
    for (const [key, t] of keys)
      add("texte", key, shortTitle(t.texte), `${t.n} scrutin${t.n > 1 ? "s" : ""} · dernier le ${t.d}`, `/hemicycle?q=${encodeURIComponent(t.texte.slice(0, 80))}`, t.texte, Math.log10(10 + t.n));
    for (const n of db.query(`SELECT id, label, axe FROM notion`).all() as any[])
      add("notion", n.id, n.label, "notion · votes lus amendement par amendement", `/notions/${n.id}`, n.axe, 2);
    for (const t of db.query(`SELECT id, label FROM theme`).all() as any[])
      add("theme", t.id, t.label, "thème", `/themes#${t.id}`, "", 1.5);
    // Glossary entries: the shared glossaire-politique package plus this site's notes (src/glossaire.ts).
    for (const m of glossaire.mots)
      add("glossaire", m.id, m.mot, m.def.length > 90 ? m.def.slice(0, 88).replace(/\s\S*$/, "") + "…" : m.def, `/glossaire#${m.id}`, `${m.def} ${m.site ?? ""}`, 2);
  })();
}

export const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
// Words that carry the question, not the subject: never searched for.
const STOP = new Set(("le la les l un une des du de d a au aux et ou en sur pour par avec comme que qui quoi quel quelle quels quelles " +
  "est sont ont a-t-il vote voter votent vote-t-il vote-t-elle votes voté votee votees votes-ils il elle ils elles ce cet cette ses son sa leur leurs " +
  "comment combien pourquoi quand est-ce t il y mon ma mes contre pas ne " +
  "qu c ce veut dire signifie definition definir definis explique expliquer").split(" "));

const ftsQuery = (q: string, op: "AND" | "OR") => {
  const words = norm(q).replace(/[^\p{L}\p{N}\s-]/gu, " ").split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w));
  return words.length ? words.map((w) => `"${w.replace(/"/g, "")}"*`).join(` ${op} `) : null;
};

export function search(db: Database, q: string, limit = 10): Hit[] {
  const m = ftsQuery(q, "AND");
  if (!m) return [];
  // Every word of the question must match; only when that finds too little do we accept any word.
  const run = (match: string) => db.query(`SELECT kind, ref, label, sub, href, weight, bm25(search, 0, 0, 10, 0, 0, 1, 0) AS r FROM search WHERE search MATCH ? ORDER BY r LIMIT 60`).all(match) as any[];
  let rows = run(m);
  if (rows.length < 3) rows = run(ftsQuery(q, "OR")!);
  let hits: Hit[] = rows.map((r) => ({ kind: r.kind, ref: r.ref, label: r.label, sub: r.sub, href: r.href, score: -r.r * BOOST[r.kind as Kind] * r.weight }));
  if (hits.length < 3 && norm(q).trim().length >= 3) {
    // Typo fallback: trigram match on the label only.
    const tri = db.query(`SELECT t.kind, t.ref, s.label, s.sub, s.href, s.weight FROM search_tri t JOIN search s ON s.kind = t.kind AND s.ref = t.ref
                          WHERE search_tri MATCH ? LIMIT 20`).all(`"${norm(q).trim().replace(/"/g, "")}"`) as any[];
    for (const r of tri) if (!hits.some((h) => h.kind === r.kind && h.ref === r.ref)) hits.push({ ...r, score: 0.1 * r.weight });
  }
  // A label written out in full in the query ("amendement") beats one that merely contains it ("sous-amendement").
  const nq = ` ${norm(q).replace(/[^\p{L}\p{N}]+/gu, " ")} `;
  for (const h of hits) if (nq.includes(` ${norm(h.label).replace(/[^\p{L}\p{N}]+/gu, " ").trim()} `)) h.score *= 3;
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}

// ---------- Questions ----------

export type Answer =
  | { intent: "definition"; mot: string; cat: string; def: string; site: string | null; voir: { id: string; mot: string }[]; href: string }
  | { intent: "accord"; a: Hit; b: Hit; communs: number; accord: number; taux: number; href: string }
  | { intent: "vote_texte"; depute: Hit; texte: Hit; ensemble: { id: string; date: string; titre: string; position: string }[];
      details: { total: number; pour: number; contre: number; abstention: number; absent: number }; href: string }
  | { intent: "qui_a_vote"; texte: Hit; position: "pour" | "contre"; scrutin: { id: string; titre: string; date: string; sort: string; pour: number; contre: number; abstentions: number };
      groupes: { sigle: string; couleur: string | null; n: number }[]; href: string }
  | { intent: "notion"; who: Hit; notion: Hit; statut: string; favorables: number; defavorables: number; abstentions: number;
      part: number | null; verdict: string; href: string };
export type AskResult = { q: string; understood: string | null; answer: Answer | null; hits: Hit[] };

// The best hit of a kind whose label actually appears in the question (not just a loose prefix match).
function entity(hits: Hit[], kind: Kind, q: string, skip?: Hit): Hit | undefined {
  const nq = norm(q);
  return hits.find((h) => h.kind === kind && h !== skip && h.ref !== skip?.ref &&
    (kind === "texte" || nq.includes(norm(h.label.split(" ").slice(-1)[0])) || nq.includes(norm(h.label))));
}


export function ask(db: Database, q: string): AskResult {
  const hits = search(db, q, 25);
  const nq = norm(q).replace(/[’‘']/g, " ");
  const top = hits.slice(0, 10);

  // "Qu'est-ce que la TVA ?" / "c'est quoi un 49.3" / "que veut dire dissidence": the glossary entry, in full.
  if (/\bqu est ce\b|\bc est quoi\b|\bque (veut dire|signifie)\b|\bdefinition\b|\bdefinis\b|\bexplique\b/.test(nq)) {
    const g = hits.find((h) => h.kind === "glossaire");
    const m = g && glossaire.parId(g.ref);
    if (m) return { q, hits: top.filter((h) => h !== g), understood: `définition : ${m.mot}`,
      answer: { intent: "definition", mot: m.mot, cat: m.cat, def: m.def, site: m.site ?? null,
        voir: (m.voir ?? []).flatMap((id) => { const v = glossaire.parId(id); return v ? [{ id, mot: v.mot }] : []; }), href: `/glossaire#${m.id}` } };
  }

  // "X vote comme Y" / "X et Y votent-ils pareil" / "accord entre X et Y" — two groups.
  if (/\bcomme\b|pareil|meme chose|accord|ensemble|d'accord|avec\b/.test(nq)) {
    const gs = hits.filter((h) => h.kind === "groupe");
    const a = gs[0], b = gs.find((g) => g.ref !== a?.ref);
    if (a && b) {
      const r: any = db.query(`SELECT communs, accord FROM stat_accord_groupes WHERE scope = 'ensemble' AND a = ? AND b = ?`).get(a.ref, b.ref);
      if (r?.communs) return { q, hits: top, understood: `accord entre ${a.label} et ${b.label} (votes sur l'ensemble des textes)`,
        answer: { intent: "accord", a, b, communs: r.communs, accord: r.accord, taux: (100 * r.accord) / r.communs, href: `/accords?groupe=${a.ref}` } };
    }
  }

  // "Qui a voté pour/contre T" — the final vote on the text.
  const pos = /\bcontre\b/.test(nq) ? "contre" : /\bpour\b/.test(nq) ? "pour" : null;
  if (/\bqui\b/.test(nq) && pos) {
    const t = entity(hits, "texte", q);
    if (t) {
      const s: any = db.query(`SELECT id, titre, date, sort, pour, contre, abstentions FROM scrutin WHERE texte IN (SELECT texte FROM texte_key WHERE key = ?) AND kind = 'ensemble' ORDER BY date DESC, numero DESC LIMIT 1`).get(t.ref);
      if (s) {
        const groupes = db.query(`SELECT g.sigle, g.couleur, COUNT(*) n FROM vote v JOIN groupe g ON g.id = v.groupe_id
                                  WHERE v.scrutin_id = ? AND v.position = ? GROUP BY g.id ORDER BY n DESC`).all(s.id, pos) as any[];
        return { q, hits: top, understood: `qui a voté ${pos} : ${t.label} (vote sur l'ensemble du ${s.date})`,
          answer: { intent: "qui_a_vote", texte: t, position: pos, scrutin: s, groupes, href: `/hemicycle?id=${s.id}` } };
      }
    }
  }

  // "Le RN est-il pour le nucléaire ?" / "Borne et l'immigration": a group or deputy against a notion.
  // Same thresholds as the site (web/lib/format.ts verdict): fewer than 5 votes is "trop peu de votes".
  const notion = hits.find((h) => h.kind === "notion");
  const who = hits.find((h) => h.kind === "groupe") ?? hits.find((h) => h.kind === "depute");
  const dep0 = entity(hits, "depute", q), tex0 = entity(hits, "texte", q);
  if (notion && who && !(dep0 && tex0 && /\bvot/.test(nq))) {
    const table = who.kind === "groupe" ? "stat_notion_groupe" : "stat_notion_depute";
    const r: any = db.query(`SELECT favorables, defavorables, abstentions FROM ${table} WHERE notion_id = ? AND who = ?`).get(notion.ref, who.ref);
    const n: any = db.query(`SELECT statut FROM notion WHERE id = ?`).get(notion.ref);
    if (r && n) {
      const tot = r.favorables + r.defavorables, part = tot ? (100 * r.favorables) / tot : null;
      const verdict = n.statut === "données directes" ? "données directes" : tot < 5 ? "trop peu de votes" : part! >= 67 ? "plutôt favorable" : part! <= 33 ? "plutôt défavorable" : "partagé";
      return { q, hits: top, understood: `position de ${who.label} sur la notion : ${notion.label}`,
        answer: { intent: "notion", who, notion, statut: n.statut, favorables: r.favorables, defavorables: r.defavorables, abstentions: r.abstentions, part, verdict, href: `/notions/${notion.ref}` } };
    }
  }

  // "Comment X a voté sur T": the votes on the whole text first (what people mean), then the
  // amendments and articles counted apart — mixing them would make a supporter look opposed.
  const d = entity(hits, "depute", q), t = entity(hits, "texte", q);
  if (d && t) {
    const rows = db.query(`SELECT s.id, s.date, s.kind, s.titre, v.position FROM scrutin s LEFT JOIN vote v ON v.scrutin_id = s.id AND v.depute_id = ?
                           WHERE s.texte IN (SELECT texte FROM texte_key WHERE key = ?) ORDER BY s.date, s.numero`).all(d.ref, t.ref) as any[];
    if (rows.length) {
      const ensemble = rows.filter((r) => r.kind === "ensemble").map((r) => ({ id: r.id, date: r.date, titre: r.titre, position: (r.position ?? "absent") as string }));
      const rest = rows.filter((r) => r.kind !== "ensemble");
      const c = (p: string) => rest.filter((r) => (r.position ?? "absent") === p).length;
      return { q, hits: top, understood: `votes de ${d.label} sur : ${t.label}`,
        answer: { intent: "vote_texte", depute: d, texte: t, ensemble,
          details: { total: rest.length, pour: c("pour"), contre: c("contre"), abstention: c("abstention"), absent: c("absent") + c("non_votant") },
          href: `/depute/${d.ref}` } };
    }
  }

  return { q, hits: top, understood: null, answer: null };
}
