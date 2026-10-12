import { Database } from "bun:sqlite";

export const DB_PATH = new URL("../data/scrutins.db", import.meta.url).pathname;

export function open() {
  return new Database(DB_PATH, { readonly: true });
}

// Expressed vote that differs from the group's majority position.
const EXPRIME = "v.position IN ('pour','contre','abstention')";

export const queries = {
  overview: (db: Database) =>
    db.query(`SELECT (SELECT COUNT(*) FROM scrutin) scrutins,
                     (SELECT MIN(date) FROM scrutin) du, (SELECT MAX(date) FROM scrutin) au,
                     (SELECT COUNT(*) FROM vote) votes,
                     (SELECT COUNT(*) FROM scrutin WHERE sort = 'adopté') adoptes`).get(),

  groupes: (db: Database) =>
    db.query(`
      SELECT * FROM stat_groupe ORDER BY cohesion DESC`).all(),

  mensuel: (db: Database) =>
    db.query(`SELECT substr(date,1,7) mois, COUNT(*) total,
                     SUM(sort = 'adopté') adoptes, SUM(sort != 'adopté') rejetes
              FROM scrutin GROUP BY 1 ORDER BY 1`).all(),

  deputes: (db: Database, limit = 577, min = 50) =>
    db.query(`
      SELECT * FROM stat_depute WHERE votes_exprimes >= ? ORDER BY dissidence DESC LIMIT ?
    `).all(min, limit),

  scrutins: (db: Database, q: string, limit = 100) =>
    db.query(`SELECT id, numero, date, type, sort, titre, pour, contre, abstentions, votants
              FROM scrutin WHERE titre LIKE ? ORDER BY date DESC, numero DESC LIMIT ?`)
      .all(`%${q}%`, limit),
};

// Heavy aggregates: computed once per ingest, stored as tables, read by the API.
export const MATERIALIZED = {
  stat_groupe: `WITH c AS (
        SELECT v.groupe_id, COUNT(*) exprimes, SUM(v.position != m.position) dissidents
        FROM vote v JOIN majorite m ON m.scrutin_id = v.scrutin_id AND m.groupe_id = v.groupe_id
        WHERE ${EXPRIME} GROUP BY v.groupe_id),
      p AS (
        SELECT v.groupe_id, COUNT(*) exprimes FROM vote v WHERE ${EXPRIME} GROUP BY v.groupe_id),
      e AS (SELECT groupe_id, SUM(membres) places, COUNT(*) scrutins FROM effectif GROUP BY groupe_id)
      SELECT g.id, g.sigle, g.nom, g.couleur,
             p.exprimes AS votes_exprimes, e.places, e.scrutins,
             ROUND(100.0 * p.exprimes / e.places, 1) AS participation,
             ROUND(100.0 * (c.exprimes - c.dissidents) / c.exprimes, 1) AS cohesion
      FROM groupe g JOIN p ON p.groupe_id = g.id JOIN c ON c.groupe_id = g.id JOIN e ON e.groupe_id = g.id
      WHERE p.exprimes > 0`,
  stat_depute: `SELECT d.id, d.prenom || ' ' || d.nom AS nom,
             (SELECT g.sigle FROM vote v2 JOIN scrutin s2 ON s2.id = v2.scrutin_id
                JOIN groupe g ON g.id = v2.groupe_id
              WHERE v2.depute_id = d.id ORDER BY s2.date DESC, s2.numero DESC LIMIT 1) AS groupe,
             COUNT(*) AS votes_exprimes,
             ROUND(100.0 * SUM(v.position != m.position) / COUNT(*), 1) AS dissidence,
             ROUND(100.0 * SUM(v.delegation) / COUNT(*), 1) AS delegation
      FROM depute d
      JOIN vote v ON v.depute_id = d.id AND ${EXPRIME}
      JOIN majorite m ON m.scrutin_id = v.scrutin_id AND m.groupe_id = v.groupe_id
      GROUP BY d.id`,
};
