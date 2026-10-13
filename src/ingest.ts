import { Database } from "bun:sqlite";
import { Glob } from "bun";
import { readdirSync, renameSync, rmSync } from "node:fs";
import { RAW } from "./fetch";
import { MATERIALIZED } from "./stats";
import { buildSearchIndex } from "./search";
import { computeCartes } from "./carte";
import { ingestAmendements } from "./amendements";
import { ingestNotionLabels } from "./notion-labels";
import { THEMES, parseTitre, themesOf } from "./themes";

const OUT = new URL("../data/scrutins.db", import.meta.url).pathname;
const TMP = `${OUT}.tmp`;

const arr = <T>(x: T | T[] | null | undefined): T[] =>
  x == null ? [] : Array.isArray(x) ? x : [x];
const json = (p: string) => Bun.file(p).json();

const POSITIONS = [
  ["pours", "pour"],
  ["contres", "contre"],
  ["abstentions", "abstention"],
  ["nonVotants", "non_votant"],
] as const;

export async function ingest() {
  rmSync(TMP, { force: true });
  const db = new Database(TMP);
  db.exec("PRAGMA journal_mode = OFF; PRAGMA synchronous = OFF;");
  db.exec(await Bun.file(new URL("./schema.sql", import.meta.url)).text());

  const insGroupe = db.prepare("INSERT OR REPLACE INTO groupe VALUES (?,?,?,?)");
  const insDepute = db.prepare("INSERT OR REPLACE INTO depute VALUES (?,?,?)");
  const insScrutin = db.prepare("INSERT INTO scrutin VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
  const insVote = db.prepare("INSERT INTO vote VALUES (?,?,?,?,?,?)");
  const insTheme = db.prepare("INSERT INTO scrutin_theme VALUES (?,?)");
  for (const th of THEMES) db.prepare("INSERT INTO theme VALUES (?,?)").run(th.id, th.label);
  const insEffectif = db.prepare("INSERT INTO effectif VALUES (?,?,?)");
  // Entries whose group ref is the broken "PO0": resolved afterwards from their members.
  db.exec(`CREATE TEMP TABLE po0_entry (entry INTEGER, scrutin_id TEXT, membres INTEGER);
           CREATE TEMP TABLE po0_vote (entry INTEGER, depute_id TEXT);`);
  const insEntry = db.prepare("INSERT INTO po0_entry VALUES (?,?,?)");
  const insEntryVote = db.prepare("INSERT INTO po0_vote VALUES (?,?)");
  let entry = 0;


  // Groups: AMO10 defines the active ones of the 17th legislature.
  for (const f of readdirSync(`${RAW}amo10/json/organe`)) {
    const o = (await json(`${RAW}amo10/json/organe/${f}`)).organe;
    if (o.codeType === "GP" && String(o.legislature) === "17")
      insGroupe.run(o.uid, o.libelleAbrev, o.libelle, o.couleurAssociee);
  }

  // Deputies: AMO30 holds every actor of the period, including those who left.
  const acteurs: [string, string, string][] = [];
  for (const f of readdirSync(`${RAW}amo30/json/acteur`)) {
    const a = (await json(`${RAW}amo30/json/acteur/${f}`)).acteur;
    acteurs.push([a.uid["#text"], a.etatCivil.ident.prenom, a.etatCivil.ident.nom]);
  }
  db.transaction(() => acteurs.forEach((r) => insDepute.run(...r)))();

  // Scrutins + nominative votes.
  const files = readdirSync(`${RAW}scrutins/json`).filter((f) => f.endsWith(".json"));
  const rows: any[] = [];
  for (const f of files) rows.push((await json(`${RAW}scrutins/json/${f}`)).scrutin);

  db.transaction(() => {
    for (const s of rows) {
      const d = s.syntheseVote.decompte;
      const { texte, etape, kind } = parseTitre(s.titre);
      insScrutin.run(
        s.uid, +s.numero, s.dateScrutin, s.typeVote.codeTypeVote, s.sort.code, s.titre, texte, etape, kind,
        +s.syntheseVote.nombreVotants, +s.syntheseVote.suffragesExprimes,
        +d.pour, +d.contre, +d.abstentions, +d.nonVotants, s.objet?.dossierLegislatif?.dossierRef ?? null,
      );
      for (const id of themesOf(s.titre, texte)) insTheme.run(s.uid, id);
      for (const g of arr<any>(s.ventilationVotes.organe.groupes.groupe)) {
        const broken = g.organeRef === "PO0";
        const id = ++entry;
        if (broken) insEntry.run(id, s.uid, +g.nombreMembresGroupe);
        else insEffectif.run(s.uid, g.organeRef, +g.nombreMembresGroupe);
        const nom = g.vote.decompteNominatif;
        for (const [key, position] of POSITIONS)
          for (const v of arr<any>(nom?.[key]?.votant)) {
            insVote.run(s.uid, v.acteurRef, g.organeRef, position, v.parDelegation === "true" ? 1 : 0, v.numPlace ? +v.numPlace : null);
            if (broken) insEntryVote.run(id, v.acteurRef);
          }
      }
    }
  })();

  // PO0 is a broken group reference in the source: reassign each deputy to the
  // group they are most often listed under elsewhere.
  db.exec(`
    DELETE FROM depute WHERE id NOT IN (SELECT depute_id FROM vote);
    INSERT INTO siege
      SELECT v.place, v.depute_id, MIN(s.date), MAX(s.date), COUNT(*)
      FROM vote v JOIN scrutin s ON s.id = v.scrutin_id
      WHERE v.place IS NOT NULL AND v.delegation = 0 GROUP BY v.place, v.depute_id;
    CREATE TABLE appartenance AS
      SELECT v.depute_id, v.groupe_id, MIN(s.date) debut, MAX(s.date) fin
      FROM vote v JOIN scrutin s ON s.id = v.scrutin_id WHERE v.groupe_id != 'PO0' GROUP BY 1, 2;
    CREATE INDEX appartenance_depute ON appartenance (depute_id);
    CREATE TEMP TABLE habitual AS
      SELECT depute_id, groupe_id FROM (
        SELECT depute_id, groupe_id,
               ROW_NUMBER() OVER (PARTITION BY depute_id ORDER BY COUNT(*) DESC) AS r
        FROM vote WHERE groupe_id != 'PO0' GROUP BY depute_id, groupe_id)
      WHERE r = 1;
    UPDATE vote SET groupe_id = (SELECT groupe_id FROM habitual h WHERE h.depute_id = vote.depute_id)
      WHERE groupe_id = 'PO0' AND depute_id IN (SELECT depute_id FROM habitual);
    -- group of a broken entry = group most of its members habitually sit in
    INSERT INTO effectif
      SELECT e.scrutin_id, (SELECT h.groupe_id FROM po0_vote pv JOIN habitual h USING (depute_id)
                            WHERE pv.entry = e.entry GROUP BY h.groupe_id ORDER BY COUNT(*) DESC LIMIT 1),
             e.membres
      FROM po0_entry e
      WHERE EXISTS (SELECT 1 FROM po0_vote pv JOIN habitual h USING (depute_id) WHERE pv.entry = e.entry);
  `);

  // Majority position per (scrutin, group) among expressed votes; absent on ties.
  db.exec(`
    CREATE TABLE majorite AS
    WITH n AS (
      SELECT scrutin_id, groupe_id, position, COUNT(*) AS n FROM vote
      WHERE position IN ('pour','contre','abstention') GROUP BY 1,2,3),
    r AS (
      SELECT *, ROW_NUMBER() OVER w AS r, LEAD(n) OVER w AS n2
      FROM n WINDOW w AS (PARTITION BY scrutin_id, groupe_id ORDER BY n DESC))
    SELECT scrutin_id, groupe_id, position FROM r WHERE r = 1 AND (n2 IS NULL OR n > n2);
    CREATE UNIQUE INDEX majorite_pk ON majorite (scrutin_id, groupe_id);
  `);

  // Groups referenced by votes but absent from the referential (dissolved).
  db.exec(`
    INSERT INTO groupe SELECT DISTINCT groupe_id, groupe_id, 'Groupe non référencé ('||groupe_id||')', NULL
    FROM vote WHERE groupe_id NOT IN (SELECT id FROM groupe);
    ANALYZE;
  `);

  // Second reference to the same political family (renamed in Sept 2025).
  db.exec(`UPDATE groupe SET sigle = 'UDR', nom = 'Union des droites pour la République (réf. antérieure)',
             couleur = (SELECT couleur FROM groupe WHERE id = 'PO872880')
           WHERE id = 'PO847173'`);

  await ingestNotionLabels(db);
  for (const [name, sql] of Object.entries(MATERIALIZED)) db.exec(`CREATE TABLE ${name} AS ${sql}`);
  ingestAmendements(db, acteurs);
  computeCartes(db);
  buildSearchIndex(db);
  db.close();
  renameSync(TMP, OUT); // atomic swap: readers never see a half-built db
}

if (import.meta.main) {
  const t = performance.now();
  await ingest();
  console.log(`ingest ok in ${((performance.now() - t) / 1000).toFixed(1)}s`);
}
