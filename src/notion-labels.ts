import type { Database } from "bun:sqlite";
import { existsSync, readdirSync } from "node:fs";

// Loads notions/*.json (hand-labelled amendments, see src/notions.ts) into the database.
const DIR = new URL("../notions/", import.meta.url).pathname;

type Label = { scrutin: string; amendement: string; sens: -1 | 0 | 1; confiance: string; note: string };
type File = { notion: string; label: string; axe: string; statut: string; methode: string; etiquettes: Label[] };

export async function ingestNotionLabels(db: Database) {
  db.exec(`
    CREATE TABLE notion (id TEXT PRIMARY KEY, label TEXT NOT NULL, axe TEXT NOT NULL, statut TEXT NOT NULL, methode TEXT NOT NULL);
    CREATE TABLE notion_vote (
      notion_id TEXT NOT NULL, scrutin_id TEXT NOT NULL, amendement_uid TEXT NOT NULL,
      sens INTEGER NOT NULL, confiance TEXT NOT NULL, note TEXT NOT NULL,
      PRIMARY KEY (notion_id, scrutin_id)
    ) WITHOUT ROWID;`);
  if (!existsSync(DIR)) return;
  const insN = db.prepare("INSERT INTO notion VALUES (?,?,?,?,?)");
  const insV = db.prepare("INSERT INTO notion_vote VALUES (?,?,?,?,?,?)");
  const known = new Set((db.query("SELECT id FROM scrutin").all() as { id: string }[]).map((r) => r.id));
  let skipped = 0;
  for (const f of readdirSync(DIR).filter((x) => x.endsWith(".json")).sort()) {
    const d: File = await Bun.file(`${DIR}${f}`).json();
    insN.run(d.notion, d.label, d.axe, d.statut, d.methode);
    for (const e of d.etiquettes) {
      if (!known.has(e.scrutin)) { skipped++; continue; }
      insV.run(d.notion, e.scrutin, e.amendement, e.sens, e.confiance, e.note);
    }
  }
  if (skipped) console.log(`notions: ${skipped} labels point to a scrutin that is not in the data, skipped`);
}
