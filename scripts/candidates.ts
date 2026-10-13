// Lists the amendments (with a recorded vote) that touch a notion, divisive ones first.
//   bun scripts/candidates.ts <notion> [--json out.json] [--min-minority 0.1] [--limit 400]
import { Database } from "bun:sqlite";
import { NOTIONS } from "../src/notions";

const args = process.argv.slice(2);
const id = args[0];
const opt = (name: string, def: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const notion = NOTIONS.find((n) => n.id === id);
if (!notion) { console.error("notions:", NOTIONS.map((n) => n.id).join(", ")); process.exit(1); }

const minority = +opt("--min-minority", "0.1");
const limit = +opt("--limit", "400");
const db = new Database(new URL("../data/scrutins.db", import.meta.url).pathname, { readonly: true });

const rows = db.query(`
  SELECT s.id scrutin, s.numero, s.date, s.titre, s.pour, s.contre, s.abstentions, s.sort,
         a.uid amendement, a.groupe_id, a.gouvernement, t.expose, t.dispositif
  FROM scrutin_amendement sa JOIN scrutin s ON s.id = sa.scrutin_id
    JOIN amendement a ON a.uid = sa.amendement_uid JOIN amendement_texte t ON t.uid = a.uid`).all() as any[];

const out = [];
for (const r of rows) {
  const text = `${r.expose} ${r.dispositif}`.toLowerCase();
  const hits = (text.match(notion.include) ?? []).length;
  if (hits < notion.minHits || notion.exclude?.test(text)) continue;
  const exprimes = r.pour + r.contre;
  const minor = exprimes ? Math.min(r.pour, r.contre) / exprimes : 0;
  if (minor < minority) continue;
  out.push({ ...r, hits, minority: +minor.toFixed(2) });
}
out.sort((a, b) => b.hits - a.hits || b.minority - a.minority);
const kept = out.slice(0, limit);
console.log(`${notion.label}: ${rows.length} linked amendments -> ${out.length} candidates (minority >= ${minority}); showing ${kept.length}`);
const json = opt("--json", "");
if (json) await Bun.write(json, JSON.stringify(kept, null, 1));
