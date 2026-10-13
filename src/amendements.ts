import type { Database } from "bun:sqlite";
import { Glob } from "bun";
import { existsSync } from "node:fs";
import { RAW } from "./fetch";

// Amendments (open data "Tous les amendements") and their link to the scrutins that voted on them.
// The scrutin title gives the amendment number and its author's name; the amendment file gives
// the text. The link is made in three passes of decreasing confidence and only kept when unique.

const norm = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z ]/g, "").replace(/\s+/g, " ").trim();

const ENTITIES: Record<string, string> = { nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", rsquo: "’", lsquo: "‘", laquo: "«", raquo: "»", ndash: "–", mdash: "—", hellip: "…" };
export function plainText(html: unknown): string {
  if (typeof html !== "string") return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m)
    .replace(/[\s ]+/g, " ")
    .trim();
}

type Slim = {
  uid: string; num: string; txt: string; acteur: string | null; gouv: boolean; groupe: string | null;
  sort: string | null; ds: string; dep: string | null; article: string | null; file: string;
};

const str = (v: unknown): string | null => (typeof v === "string" ? v : null);

// "l'amendement n° 573 (rect.) de M. Armishahi après l'article 10 du projet de loi …"
const TITRE = /^l[’']amendement(?: de [a-zé]+)? n°\s*(\d+)(?:\s*\((?:rect\.|rectifié)[^)]*\)|\s*rectifié)?\s+(?:de |du |des )?(.*?)(?: et (?:l[’']|les )amendements? identiques?| à l[’']| après l[’']| avant l[’']| au | aux | sur | portant|$)/i;

export function ingestAmendements(db: Database, acteurs: [string, string, string][]) {
  const dir = `${RAW}amendements/json`;
  db.exec(`DROP TABLE IF EXISTS amendement; DROP TABLE IF EXISTS scrutin_amendement; DROP TABLE IF EXISTS amendement_texte;
    CREATE TABLE amendement (uid TEXT PRIMARY KEY, numero TEXT NOT NULL, texte_ref TEXT, acteur_id TEXT, groupe_id TEXT,
      gouvernement INTEGER NOT NULL, sort TEXT, date_sort TEXT, date_depot TEXT, article TEXT);
    CREATE TABLE scrutin_amendement (scrutin_id TEXT PRIMARY KEY, amendement_uid TEXT NOT NULL, passe INTEGER NOT NULL);
    CREATE TABLE amendement_texte (uid TEXT PRIMARY KEY, expose TEXT, dispositif TEXT);`);
  if (!existsSync(dir)) { console.log("amendements: raw data absent, skipped"); return; }

  const names = new Map(acteurs.map(([id, prenom, nom]) => [id, [norm(nom), norm(`${prenom} ${nom}`)] as const]));
  const slim: Slim[] = [];
  for (const rel of new Glob("*/*/*.json").scanSync({ cwd: dir })) {
    try {
      const a = JSON.parse(require("node:fs").readFileSync(`${dir}/${rel}`, "utf8")).amendement;
      const au = a.signataires?.auteur ?? {};
      const div = a.pointeurFragmentTexte?.division;
      slim.push({
        uid: a.uid, num: String(a.identification?.numeroLong ?? ""), txt: a.texteLegislatifRef, acteur: str(au.acteurRef),
        gouv: au.typeAuteur === "Gouvernement", groupe: str(au.groupePolitiqueRef),
        sort: str(a.cycleDeVie?.sort), ds: (str(a.cycleDeVie?.dateSort) ?? "").slice(0, 10), dep: str(a.cycleDeVie?.dateDepot),
        article: div ? [str(div.avant_A_Apres) === "A" ? "" : str(div.avant_A_Apres), str(div.articleDesignation)].filter(Boolean).join(" ") || null : null,
        file: rel,
      });
    } catch { /* unreadable file: skip */ }
  }

  const byDay = new Map<string, Slim[]>(), byNum = new Map<string, Slim[]>();
  for (const r of slim) {
    (byNum.get(r.num) ?? byNum.set(r.num, []).get(r.num)!).push(r);
    if (r.ds) { const k = `${r.num}|${r.ds}`; (byDay.get(k) ?? byDay.set(k, []).get(k)!).push(r); }
  }
  const authored = (c: Slim, auth: string, titre: string) => {
    if (/^gouvernement/i.test(auth) || /du gouvernement/i.test(titre.slice(0, 60))) return c.gouv;
    const a = norm(auth.replace(/^(m\.|mme|mmes|mm\.)\s*/i, ""));
    const n = c.acteur ? names.get(c.acteur) : undefined;
    return !!n && (a.includes(n[0]) || n[1].includes(a) || a.includes(n[1]));
  };

  const scrutins = db.query(`SELECT id, date, titre, texte, etape FROM scrutin WHERE kind = 'amendement'`).all() as
    { id: string; date: string; titre: string; texte: string | null; etape: string | null }[];
  const matched = new Map<string, { a: Slim; passe: number }>();
  const parsed = new Map<string, { num: string; auth: string; date: string; titre: string; key: string }>();
  const learned = new Map<string, Set<string>>();

  for (const s of scrutins) { // pass 1: number + author + the day the amendment was decided
    const m = TITRE.exec(s.titre);
    if (!m) continue;
    const key = `${s.texte}|${s.etape}`;
    parsed.set(s.id, { num: m[1], auth: m[2], date: s.date, titre: s.titre, key });
    const hit = (byDay.get(`${m[1]}|${s.date}`) ?? []).filter((c) => authored(c, m[2], s.titre));
    if (hit.length === 1) { matched.set(s.id, { a: hit[0], passe: 1 }); (learned.get(key) ?? learned.set(key, new Set()).get(key)!).add(hit[0].txt); }
  }
  for (const [id, p] of parsed) { // pass 2: same, restricted to the text references learned in pass 1
    if (matched.has(id)) continue;
    const refs = learned.get(p.key);
    if (!refs) continue;
    const hit = (byNum.get(p.num) ?? []).filter((c) => refs.has(c.txt) && authored(c, p.auth, p.titre));
    if (hit.length === 1) matched.set(id, { a: hit[0], passe: 2 });
  }
  for (const [id, p] of parsed) { // pass 3: number + author, deposited before the vote; must be unique
    if (matched.has(id)) continue;
    const hit = (byNum.get(p.num) ?? []).filter((c) => (c.dep ?? "9999") <= p.date && authored(c, p.auth, p.titre));
    if (hit.length === 1) matched.set(id, { a: hit[0], passe: 3 });
  }

  const insA = db.prepare("INSERT INTO amendement VALUES (?,?,?,?,?,?,?,?,?,?)");
  const insL = db.prepare("INSERT INTO scrutin_amendement VALUES (?,?,?)");
  const insT = db.prepare("INSERT OR IGNORE INTO amendement_texte VALUES (?,?,?)");
  db.transaction(() => {
    for (const r of slim) insA.run(r.uid, r.num, r.txt, r.acteur, r.groupe, r.gouv ? 1 : 0, r.sort, r.ds || null, r.dep, r.article);
    for (const [sid, { a, passe }] of matched) {
      insL.run(sid, a.uid, passe);
      const raw = JSON.parse(require("node:fs").readFileSync(`${dir}/${a.file}`, "utf8")).amendement;
      const c = raw.corps?.contenuAuteur ?? {};
      insT.run(a.uid, plainText(c.exposeSommaire), plainText(c.dispositif));
    }
  })();
  console.log(`amendements: ${slim.length} read, ${matched.size}/${scrutins.length} scrutins linked (${((100 * matched.size) / scrutins.length).toFixed(1)} %)`);
}
