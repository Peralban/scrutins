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

  scrutins: (db: Database, o: { q?: string; theme?: string; kind?: string; limit?: number }) =>
    db.query(`SELECT s.id, s.numero, s.date, s.kind, s.sort, s.titre, s.texte, s.etape,
                     s.pour, s.contre, s.abstentions, s.votants
              FROM scrutin s
              WHERE s.titre LIKE $q
                AND ($kind = '' OR s.kind = $kind)
                AND ($theme = '' OR ($theme = '_none'
                      AND NOT EXISTS (SELECT 1 FROM scrutin_theme t WHERE t.scrutin_id = s.id))
                    OR EXISTS (SELECT 1 FROM scrutin_theme t WHERE t.scrutin_id = s.id AND t.theme_id = $theme))
              ORDER BY s.date DESC, s.numero DESC LIMIT $limit`)
      .all({ $q: `%${o.q ?? ""}%`, $kind: o.kind ?? "", $theme: o.theme ?? "", $limit: o.limit ?? 100 }),

  themes: (db: Database, scope: "ensemble" | "tous") => ({
    themes: db.query(`SELECT t.id, t.label, st.scrutins FROM theme t
                      JOIN stat_theme_scrutins st ON st.theme_id = t.id AND st.scope = ? ORDER BY t.label`).all(scope),
    groupes: db.query(`SELECT id, sigle, nom, couleur FROM stat_groupe ORDER BY cohesion DESC`).all(),
    cells: db.query(`SELECT theme_id, groupe_id, pour, contre, abstention FROM stat_theme WHERE scope = ?`).all(scope),
    non_classes: db.query(`SELECT COUNT(*) n, (SELECT COUNT(*) FROM scrutin) total FROM scrutin s
                           WHERE NOT EXISTS (SELECT 1 FROM scrutin_theme t WHERE t.scrutin_id = s.id)`).get(),
  }),

  // Seat-by-seat picture of one scrutin. Seats come from who sat where around the
  // scrutin date; a vacant seat is not drawn.
  hemicycle: (db: Database, id: string) => {
    const s: any = db.query(`SELECT * FROM scrutin WHERE id = ?`).get(id);
    if (!s) return null;
    const votes = db.query(`SELECT v.depute_id id, d.prenom || ' ' || d.nom nom, v.groupe_id, v.position, v.delegation
                            FROM vote v JOIN depute d ON d.id = v.depute_id WHERE v.scrutin_id = ?`).all(id) as any[];
    const byDepute = new Map(votes.map((v) => [v.id, v]));
    const sieges = db.query(`SELECT place, depute_id, debut, fin, votes FROM siege ORDER BY place`).all() as any[];
    const byPlace = new Map<number, any[]>();
    for (const r of sieges) (byPlace.get(r.place) ?? byPlace.set(r.place, []).get(r.place)!).push(r);
    const DAY = 864e5, GRACE = 45 * DAY, d0 = Date.parse(s.date);
    const used = new Set<string>();
    const picked: { place: number; id: string }[] = [];
    for (const [place, rows] of [...byPlace].sort((a, b) => a[0] - b[0])) {
      const cover = rows.filter((r) => r.debut <= s.date && s.date <= r.fin).sort((a, b) => b.votes - a.votes);
      const prev = rows.filter((r) => r.fin < s.date && d0 - Date.parse(r.fin) <= GRACE).sort((a, b) => (a.fin < b.fin ? 1 : -1));
      // The place holder is the one who actually voted there, else the covering one.
      const voter = cover.find((r) => byDepute.has(r.depute_id) && !used.has(r.depute_id));
      const pick = voter ?? [...cover, ...prev].find((r) => !used.has(r.depute_id));
      if (pick) { used.add(pick.depute_id); picked.push({ place, id: pick.depute_id }); }
    }
    const names = new Map((db.query(`SELECT id, prenom || ' ' || nom nom FROM depute`).all() as any[]).map((d) => [d.id, d.nom]));
    const appart = db.query(`SELECT depute_id, groupe_id, debut, fin FROM appartenance`).all() as any[];
    const groupOf = (dep: string) => {
      const a = appart.filter((x) => x.depute_id === dep);
      return (a.find((x) => x.debut <= s.date && s.date <= x.fin) ?? a.sort((x, y) => Math.abs(Date.parse(x.fin) - d0) - Math.abs(Date.parse(y.fin) - d0))[0])?.groupe_id;
    };
    const medianPlace = (g: string) => {
      const ps = picked.filter((p) => (byDepute.get(p.id)?.groupe_id ?? groupOf(p.id)) === g).map((p) => p.place).sort((a, b) => a - b);
      return ps[Math.floor(ps.length / 2)] ?? 0;
    };
    const seats = picked.map((p) => {
      const v = byDepute.get(p.id);
      return { place: p.place, id: p.id, nom: names.get(p.id), groupe: v?.groupe_id ?? groupOf(p.id), position: v?.position ?? "absent", delegation: v?.delegation ?? 0 };
    });
    // Voters with no known seat are still counted: parked next to their group.
    let extra = 0;
    for (const v of votes) if (!used.has(v.id))
      seats.push({ place: medianPlace(v.groupe_id) + 0.5 + (extra++) * 1e-3, id: v.id, nom: v.nom, groupe: v.groupe_id, position: v.position, delegation: v.delegation });
    seats.sort((a, b) => a.place - b.place);
    return { scrutin: s, seats, groupes: db.query(`SELECT id, sigle, nom, couleur FROM groupe`).all() };
  },
};

// Heavy aggregates: computed once per ingest, stored as tables, read by the API.
const THEME_SCOPE = (scope: string, cond: string) => `
  SELECT '${scope}' AS scope, t.theme_id, v.groupe_id,
         SUM(v.position = 'pour') pour, SUM(v.position = 'contre') contre, SUM(v.position = 'abstention') abstention
  FROM vote v JOIN scrutin s ON s.id = v.scrutin_id JOIN scrutin_theme t ON t.scrutin_id = s.id
  WHERE ${EXPRIME} ${cond} GROUP BY t.theme_id, v.groupe_id`;
const THEME_SCRUTINS = (scope: string, cond: string) => `
  SELECT '${scope}' AS scope, t.theme_id, COUNT(*) scrutins
  FROM scrutin_theme t JOIN scrutin s ON s.id = t.scrutin_id WHERE 1 = 1 ${cond} GROUP BY t.theme_id`;

export const MATERIALIZED = {
  stat_theme: `${THEME_SCOPE("ensemble", "AND s.kind = 'ensemble'")} UNION ALL ${THEME_SCOPE("tous", "")}`,
  stat_theme_scrutins: `${THEME_SCRUTINS("ensemble", "AND s.kind = 'ensemble'")} UNION ALL ${THEME_SCRUTINS("tous", "")}`,
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
