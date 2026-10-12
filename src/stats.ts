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

  // Share of scrutins on which two groups' majority positions are identical.
  accordGroupes: (db: Database, scope: "ensemble" | "tous", theme = "") =>
    theme === "" ? db.query(`SELECT a, b, communs, accord FROM stat_accord_groupes WHERE scope = ?`).all(scope) : db.query(`
      SELECT a.groupe_id a, b.groupe_id b, COUNT(*) communs, SUM(a.position = b.position) accord
      FROM majorite a JOIN majorite b ON b.scrutin_id = a.scrutin_id
        JOIN scrutin s ON s.id = a.scrutin_id
      WHERE ($scope = 'tous' OR s.kind = 'ensemble')
        AND ($theme = '' OR EXISTS (SELECT 1 FROM scrutin_theme t WHERE t.scrutin_id = s.id AND t.theme_id = $theme))
      GROUP BY a.groupe_id, b.groupe_id`).all({ $scope: scope, $theme: theme }),

  // Deputies voting most / least like one deputy, on scrutins where both expressed a position.
  accordDepute: (db: Database, id: string, o: { horsGroupe: boolean; min: number; kind: string }) => {
    const rows = db.query(`
      SELECT d.id, d.prenom || ' ' || d.nom nom, COUNT(*) communs, SUM(v1.position = v2.position) accord
      FROM vote v1 JOIN vote v2 ON v2.scrutin_id = v1.scrutin_id AND v2.depute_id != v1.depute_id
        JOIN depute d ON d.id = v2.depute_id JOIN scrutin s ON s.id = v1.scrutin_id
      WHERE v1.depute_id = $id AND ${EXPRIME.replaceAll("v.", "v1.")} AND ${EXPRIME.replaceAll("v.", "v2.")}
        AND ($kind = '' OR s.kind = $kind) AND ($hors = 0 OR v1.groupe_id != v2.groupe_id)
      GROUP BY d.id HAVING communs >= $min`).all({ $id: id, $kind: o.kind, $hors: o.horsGroupe ? 1 : 0, $min: o.min }) as any[];
    const groupe = new Map((db.query(`SELECT id, groupe FROM stat_depute`).all() as any[]).map((r) => [r.id, r.groupe]));
    for (const r of rows) { r.taux = +((100 * r.accord) / r.communs).toFixed(1); r.groupe = groupe.get(r.id) ?? ""; }
    rows.sort((a, b) => b.taux - a.taux || b.communs - a.communs);
    return { proches: rows.slice(0, 15), eloignes: rows.slice(-15).reverse(), candidats: rows.length };
  },

  accordDuo: (db: Database, a: string, b: string, kind: string) => {
    const names = db.query(`SELECT id, prenom || ' ' || nom nom FROM depute WHERE id IN (?, ?)`).all(a, b) as any[];
    if (names.length < 2 && a !== b) return null;
    const rows = db.query(`
      SELECT s.id, s.date, s.numero, s.kind, s.titre, v1.position pa, v2.position pb
      FROM vote v1 JOIN vote v2 ON v2.scrutin_id = v1.scrutin_id AND v2.depute_id = $b
        JOIN scrutin s ON s.id = v1.scrutin_id
      WHERE v1.depute_id = $a AND ${EXPRIME.replaceAll("v.", "v1.")} AND ${EXPRIME.replaceAll("v.", "v2.")}
        AND ($kind = '' OR s.kind = $kind) ORDER BY s.date DESC, s.numero DESC`).all({ $a: a, $b: b, $kind: kind }) as any[];
    const desaccords = rows.filter((r) => r.pa !== r.pb);
    return { a: names.find((n) => n.id === a), b: names.find((n) => n.id === b), communs: rows.length,
             accord: rows.length - desaccords.length, desaccords: desaccords.slice(0, 200), total_desaccords: desaccords.length };
  },

  depute: (db: Database, id: string, kind = "") => {
    const d: any = db.query(`SELECT id, prenom, nom FROM depute WHERE id = ?`).get(id);
    if (!d) return null;
    const groupes = db.query(`SELECT a.groupe_id id, g.sigle, g.nom, g.couleur, a.debut, a.fin
                              FROM appartenance a JOIN groupe g ON g.id = a.groupe_id
                              WHERE a.depute_id = ? ORDER BY a.debut`).all(id) as any[];
    const current = groupes.reduce((a, b) => (b.fin >= a.fin ? b : a), groupes[0]);
    const siege = db.query(`SELECT place, debut, fin, votes FROM siege WHERE depute_id = ? ORDER BY votes DESC LIMIT 1`).get(id);
    const stat: any = db.query(`SELECT votes_exprimes, dissidence, delegation FROM stat_depute WHERE id = ?`).get(id);
    const span: any = db.query(`SELECT MIN(s.date) debut, MAX(s.date) fin, COUNT(*) positions, SUM(v.delegation) delegues
                                FROM vote v JOIN scrutin s ON s.id = v.scrutin_id WHERE v.depute_id = ?`).get(id);
    const tenure: any = db.query(`SELECT COUNT(*) n FROM scrutin WHERE date BETWEEN ? AND ?`).get(span.debut, span.fin);
    const mois = db.query(`
      WITH m AS (SELECT substr(date,1,7) mois, COUNT(*) scrutins FROM scrutin
                 WHERE date BETWEEN $d AND $f GROUP BY 1),
           v AS (SELECT substr(s.date,1,7) mois, COUNT(*) votes FROM vote v JOIN scrutin s ON s.id = v.scrutin_id
                 WHERE v.depute_id = $id GROUP BY 1)
      SELECT m.mois, m.scrutins, COALESCE(v.votes, 0) votes FROM m LEFT JOIN v USING (mois) ORDER BY m.mois`)
      .all({ $d: span.debut, $f: span.fin, $id: id });
    const themes = db.query(`
      SELECT t.id, t.label, COUNT(*) n,
             SUM(v.position = 'pour') pour, SUM(v.position = 'contre') contre, SUM(v.position = 'abstention') abstention,
             SUM(m.position IS NOT NULL AND v.position != m.position) dissidents
      FROM vote v JOIN scrutin s ON s.id = v.scrutin_id AND s.kind = 'ensemble'
        JOIN scrutin_theme st ON st.scrutin_id = s.id JOIN theme t ON t.id = st.theme_id
        LEFT JOIN majorite m ON m.scrutin_id = v.scrutin_id AND m.groupe_id = v.groupe_id
      WHERE v.depute_id = ? AND v.position IN ('pour','contre','abstention')
      GROUP BY t.id ORDER BY t.label`).all(id) as any[];
    const base = new Map((db.query(`SELECT theme_id, pour, contre, abstention FROM stat_theme WHERE scope = 'ensemble' AND groupe_id = ?`)
      .all(current.id) as any[]).map((r) => [r.theme_id, r]));
    for (const t of themes) {
      const b = base.get(t.id);
      t.groupe_pour = b ? +((100 * b.pour) / (b.pour + b.contre + b.abstention)).toFixed(1) : null;
    }
    const dissidences = db.query(`
      SELECT s.id, s.date, s.numero, s.kind, s.titre, s.sort, v.position, m.position majorite, g.sigle
      FROM vote v JOIN scrutin s ON s.id = v.scrutin_id
        JOIN majorite m ON m.scrutin_id = v.scrutin_id AND m.groupe_id = v.groupe_id
        JOIN groupe g ON g.id = v.groupe_id
      WHERE v.depute_id = $id AND v.position IN ('pour','contre','abstention') AND v.position != m.position
        AND ($kind = '' OR s.kind = $kind)
      ORDER BY s.date DESC, s.numero DESC LIMIT 200`).all({ $id: id, $kind: kind });
    return { depute: d, groupes, groupe_actuel: current, siege, stat, span: { ...span, scrutins: tenure.n }, mois, themes, dissidences };
  },

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

const ACCORD = (scope: string, cond: string) => `
  SELECT '${scope}' AS scope, a.groupe_id a, b.groupe_id b, COUNT(*) communs, SUM(a.position = b.position) accord
  FROM majorite a JOIN majorite b ON b.scrutin_id = a.scrutin_id JOIN scrutin s ON s.id = a.scrutin_id
  WHERE 1 = 1 ${cond} GROUP BY a.groupe_id, b.groupe_id`;

export const MATERIALIZED = {
  stat_accord_groupes: `${ACCORD("ensemble", "AND s.kind = 'ensemble'")} UNION ALL ${ACCORD("tous", "")}`,
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
