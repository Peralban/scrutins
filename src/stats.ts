import { Database } from "bun:sqlite";

export const DB_PATH = new URL("../data/scrutins.db", import.meta.url).pathname;

export function open() {
  return new Database(DB_PATH, { readonly: true });
}

// Expressed vote that differs from the group's majority position.
const ENREGISTRE = "v.position IN ('pour','contre','abstention')";

// What a scrutin voted on: the amendment's own text when the vote is on an amendment we linked,
// and links to the official pages (amendment, amended text, legislative file). No summary: the source text only.
const AN = "https://www.assemblee-nationale.fr";
const plain = (h: string | null) => h ? h.replace(/<\/(p|li|div)>|<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
  .replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim() || null : null;
function voteTexte(db: Database, s: { id: string; date: string; texte: string | null; dossier: string | null }) {
  const a: any = db.query(`SELECT a.uid, a.numero, a.texte_ref, a.article, a.sort, a.gouvernement, d.prenom || ' ' || d.nom auteur, g.sigle groupe,
                                  t.dispositif, t.expose
                           FROM scrutin_amendement sa JOIN amendement a ON a.uid = sa.amendement_uid
                           LEFT JOIN amendement_texte t ON t.uid = a.uid LEFT JOIN depute d ON d.id = a.acteur_id LEFT JOIN groupe g ON g.id = a.groupe_id
                           WHERE sa.scrutin_id = ?`).get(s.id);
  // A vote on an article or a whole text carries no text reference: borrow one from the votes on the same
  // text, the legislative file from any of them, the examined text from amendments voted up to that day.
  const dossier = s.dossier ?? (s.texte ? (db.query(`SELECT dossier FROM scrutin WHERE texte = ? AND dossier IS NOT NULL LIMIT 1`).get(s.texte) as any)?.dossier : null);
  const texteRef = a?.texte_ref ?? (s.texte ? (db.query(`SELECT am.texte_ref FROM scrutin x JOIN scrutin_amendement sa ON sa.scrutin_id = x.id JOIN amendement am ON am.uid = sa.amendement_uid
                                                         WHERE x.texte = ? AND x.date <= ? AND am.texte_ref IS NOT NULL ORDER BY x.date DESC, x.numero DESC LIMIT 1`).get(s.texte, s.date) as any)?.texte_ref : null);
  const liens: { label: string; url: string }[] = [];
  if (a) liens.push({ label: `amendement n° ${a.numero}`, url: `${AN}/dyn/17/amendements/${a.uid}` });
  if (texteRef) liens.push({ label: a ? "texte amendé, en entier" : "texte examiné en séance", url: `${AN}/dyn/opendata/${texteRef}.html` });
  if (dossier) liens.push({ label: "dossier législatif", url: `${AN}/dyn/17/dossiers/${dossier}` });
  return {
    amendement: a ? { numero: a.numero, sort: a.sort, auteur: a.gouvernement ? "Gouvernement" : a.auteur, groupe: a.gouvernement ? null : a.groupe,
      dispositif: plain(a.dispositif), expose: plain(a.expose) } : null,
    liens,
  };
}

export const queries = {
  // One group: headline figures with their rank, notions, members, closest and furthest groups.
  // "Current members" = deputies whose latest membership period is in this group.
  groupe: (db: Database, id: string) => {
    const g: any = db.query(`SELECT * FROM stat_groupe WHERE id = ?`).get(id);
    if (!g) return null;
    const all = db.query(`SELECT id, cohesion, participation FROM stat_groupe WHERE id != 'PO847173'`).all() as any[];
    const rank = (k: string) => 1 + all.filter((x) => x[k] > g[k]).length;
    const membres = db.query(`
      SELECT d.id, d.nom, d.votes_enregistres, d.dissidence, d.delegation FROM stat_depute d
      WHERE d.id IN (SELECT a.depute_id FROM appartenance a WHERE a.groupe_id = $g
                       AND a.fin = (SELECT MAX(fin) FROM appartenance b WHERE b.depute_id = a.depute_id))
      ORDER BY d.nom`).all({ $g: id }) as any[];
    const effectif: any = db.query(`SELECT e.membres FROM effectif e JOIN scrutin s ON s.id = e.scrutin_id WHERE e.groupe_id = ? ORDER BY s.date DESC, s.numero DESC LIMIT 1`).get(id);
    return {
      groupe: g, groupes: all.length,
      rangs: { cohesion: rank("cohesion"), participation: rank("participation") },
      effectif: effectif?.membres ?? membres.length, membres,
      notions: db.query(`SELECT n.id, n.label, n.statut, s.favorables, s.defavorables, s.abstentions
                         FROM notion n JOIN stat_notion_groupe s ON s.notion_id = n.id AND s.who = ? ORDER BY n.label`).all(id),
      accords: db.query(`SELECT g.id, g.sigle, g.nom, g.couleur, a.communs, a.accord FROM stat_accord_groupes a JOIN groupe g ON g.id = a.b
                         WHERE a.scope = 'ensemble' AND a.a = ? AND a.b != a.a AND a.communs >= 10 AND g.id != 'PO847173'
                         ORDER BY 1.0 * a.accord / a.communs DESC`).all(id),
    };
  },

  // The last sitting day: its scrutins grouped by text, with the vote on the whole text when there is one.
  hier: (db: Database) => {
    const day = (db.query(`SELECT MAX(date) d FROM scrutin`).get() as any).d as string;
    const rows = db.query(`SELECT id, numero, kind, sort, titre, texte, pour, contre, abstentions FROM scrutin WHERE date = ? ORDER BY numero`).all(day) as any[];
    const by = new Map<string, any[]>();
    for (const r of rows) { const k = r.texte ?? r.titre; (by.get(k) ?? by.set(k, []).get(k)!).push(r); }
    const textes = [...by.entries()].map(([titre, rs]) => {
      const main = rs.find((r) => r.kind === "ensemble") ?? (rs.length === 1 ? rs[0] : null);
      return { titre, scrutins: rs.length, id: (main ?? rs[rs.length - 1]).id,
        vote: main ? { kind: main.kind, sort: main.sort, pour: main.pour, contre: main.contre, abstentions: main.abstentions } : null };
    }).sort((a, b) => Number(!!b.vote) - Number(!!a.vote) || b.scrutins - a.scrutins);
    return { date: day, scrutins: rows.length, textes };
  },

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

  deputes: (db: Database, limit = 2000, min = 50) =>
    db.query(`
      SELECT * FROM stat_depute WHERE votes_enregistres >= ? ORDER BY dissidence DESC LIMIT ?
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
      WHERE v1.depute_id = $id AND ${ENREGISTRE.replaceAll("v.", "v1.")} AND ${ENREGISTRE.replaceAll("v.", "v2.")}
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
      WHERE v1.depute_id = $a AND ${ENREGISTRE.replaceAll("v.", "v1.")} AND ${ENREGISTRE.replaceAll("v.", "v2.")}
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
    const stat: any = db.query(`SELECT votes_enregistres, dissidence, delegation FROM stat_depute WHERE id = ?`).get(id);
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

  carte: (db: Database, scope: string) => {
    const meta = db.query(`SELECT * FROM carte_meta WHERE scope = ?`).get(scope);
    if (!meta) return null;
    return {
      meta,
      points: db.query(`SELECT c.depute_id id, sd.nom, sd.groupe, c.x, c.y, c.votes
                        FROM carte c JOIN stat_depute sd ON sd.id = c.depute_id WHERE c.scope = ?`).all(scope),
      groupes: db.query(`SELECT sigle, nom, couleur FROM groupe`).all(),
      scopes: db.query(`SELECT m.scope, COALESCE(t.label, 'Tous les scrutins') label, m.scrutins, m.deputes
                        FROM carte_meta m LEFT JOIN theme t ON t.id = m.scope ORDER BY (m.scope = 'all') DESC, label`).all(),
    };
  },

  notions: (db: Database) =>
    db.query(`SELECT n.id, n.label, n.axe, n.statut,
                     SUM(nv.sens = 1) favorables, SUM(nv.sens = -1) defavorables, SUM(nv.sens = 0) ecartes
              FROM notion n LEFT JOIN notion_vote nv ON nv.notion_id = n.id GROUP BY n.id ORDER BY n.label`).all(),

  notion: (db: Database, id: string) => {
    const n: any = db.query(`SELECT id, label, axe, statut, methode FROM notion WHERE id = ?`).get(id);
    if (!n) return null;
    return {
      notion: n,
      groupes: db.query(`SELECT g.id, g.sigle, g.nom, g.couleur, s.favorables, s.defavorables, s.abstentions
                         FROM stat_notion_groupe s JOIN groupe g ON g.id = s.who WHERE s.notion_id = ?`).all(id),
      deputes: db.query(`SELECT d.id, d.nom, d.groupe, s.favorables, s.defavorables, s.abstentions
                         FROM stat_notion_depute s JOIN stat_depute d ON d.id = s.who WHERE s.notion_id = ?`).all(id),
      votes: db.query(`SELECT sc.id, sc.numero, sc.date, sc.titre, sc.sort, sc.pour, sc.contre, sc.abstentions,
                              nv.sens, nv.confiance, nv.note, nv.amendement_uid
                       FROM notion_vote nv JOIN scrutin sc ON sc.id = nv.scrutin_id
                       WHERE nv.notion_id = ? ORDER BY nv.sens = 0, sc.date DESC, sc.numero DESC`).all(id),
    };
  },

  deputeNotions: (db: Database, id: string) =>
    db.query(`SELECT n.id, n.label, n.statut, COALESCE(s.favorables, 0) favorables, COALESCE(s.defavorables, 0) defavorables,
                     COALESCE(s.abstentions, 0) abstentions
              FROM notion n LEFT JOIN stat_notion_depute s ON s.notion_id = n.id AND s.who = ? ORDER BY n.label`).all(id),

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
    return { scrutin: s, seats, groupes: db.query(`SELECT id, sigle, nom, couleur FROM groupe`).all(), vote: voteTexte(db, s) };
  },
};

// Heavy aggregates: computed once per ingest, stored as tables, read by the API.
const THEME_SCOPE = (scope: string, cond: string) => `
  SELECT '${scope}' AS scope, t.theme_id, v.groupe_id,
         SUM(v.position = 'pour') pour, SUM(v.position = 'contre') contre, SUM(v.position = 'abstention') abstention
  FROM vote v JOIN scrutin s ON s.id = v.scrutin_id JOIN scrutin_theme t ON t.scrutin_id = s.id
  WHERE ${ENREGISTRE} ${cond} GROUP BY t.theme_id, v.groupe_id`;
const THEME_SCRUTINS = (scope: string, cond: string) => `
  SELECT '${scope}' AS scope, t.theme_id, COUNT(*) scrutins
  FROM scrutin_theme t JOIN scrutin s ON s.id = t.scrutin_id WHERE 1 = 1 ${cond} GROUP BY t.theme_id`;

const ACCORD = (scope: string, cond: string) => `
  SELECT '${scope}' AS scope, a.groupe_id a, b.groupe_id b, COUNT(*) communs, SUM(a.position = b.position) accord
  FROM majorite a JOIN majorite b ON b.scrutin_id = a.scrutin_id JOIN scrutin s ON s.id = a.scrutin_id
  WHERE 1 = 1 ${cond} GROUP BY a.groupe_id, b.groupe_id`;

// Votes on labelled amendments: a vote "pour" follows the amendment's direction, "contre" opposes it.
const NOTION_SELECT = (who: string) => `
  SELECT nv.notion_id, ${who} AS who,
         SUM((v.position = 'pour' AND nv.sens = 1) OR (v.position = 'contre' AND nv.sens = -1)) AS favorables,
         SUM((v.position = 'contre' AND nv.sens = 1) OR (v.position = 'pour' AND nv.sens = -1)) AS defavorables,
         SUM(v.position = 'abstention') AS abstentions
  FROM vote v JOIN notion_vote nv ON nv.scrutin_id = v.scrutin_id
  WHERE nv.sens != 0 AND ${ENREGISTRE}
  GROUP BY nv.notion_id, ${who}`;

export const MATERIALIZED = {
  stat_notion_depute: NOTION_SELECT("v.depute_id"),
  stat_notion_groupe: NOTION_SELECT("v.groupe_id"),
  stat_accord_groupes: `${ACCORD("ensemble", "AND s.kind = 'ensemble'")} UNION ALL ${ACCORD("tous", "")}`,
  stat_theme: `${THEME_SCOPE("ensemble", "AND s.kind = 'ensemble'")} UNION ALL ${THEME_SCOPE("tous", "")}`,
  stat_theme_scrutins: `${THEME_SCRUTINS("ensemble", "AND s.kind = 'ensemble'")} UNION ALL ${THEME_SCRUTINS("tous", "")}`,
  stat_groupe: `WITH c AS (
        SELECT v.groupe_id, COUNT(*) enregistres, SUM(v.position != m.position) dissidents
        FROM vote v JOIN majorite m ON m.scrutin_id = v.scrutin_id AND m.groupe_id = v.groupe_id
        WHERE ${ENREGISTRE} GROUP BY v.groupe_id),
      p AS (
        SELECT v.groupe_id, COUNT(*) enregistres FROM vote v WHERE ${ENREGISTRE} GROUP BY v.groupe_id),
      e AS (SELECT groupe_id, SUM(membres) places, COUNT(*) scrutins FROM effectif GROUP BY groupe_id)
      SELECT g.id, g.sigle, g.nom, g.couleur,
             p.enregistres AS votes_enregistres, e.places, e.scrutins,
             ROUND(100.0 * p.enregistres / e.places, 1) AS participation,
             ROUND(100.0 * (c.enregistres - c.dissidents) / c.enregistres, 1) AS cohesion
      FROM groupe g JOIN p ON p.groupe_id = g.id JOIN c ON c.groupe_id = g.id JOIN e ON e.groupe_id = g.id
      WHERE p.enregistres > 0`,
  // Every deputy appears, including those with no expressed vote (members of the government
  // vote through their substitute): their figures are 0 / NULL rather than absent.
  stat_depute: `SELECT d.id, d.prenom || ' ' || d.nom AS nom,
             (SELECT g.sigle FROM vote v2 JOIN scrutin s2 ON s2.id = v2.scrutin_id
                JOIN groupe g ON g.id = v2.groupe_id
              WHERE v2.depute_id = d.id ORDER BY s2.date DESC, s2.numero DESC LIMIT 1) AS groupe,
             COUNT(x.depute_id) AS votes_enregistres,
             ROUND(100.0 * SUM(x.position != x.majorite) / COUNT(x.depute_id), 1) AS dissidence,
             ROUND(100.0 * SUM(x.delegation) / COUNT(x.depute_id), 1) AS delegation
      FROM depute d
      LEFT JOIN (SELECT v.depute_id, v.position, v.delegation, m.position AS majorite
                 FROM vote v JOIN majorite m ON m.scrutin_id = v.scrutin_id AND m.groupe_id = v.groupe_id
                 WHERE ${ENREGISTRE}) x ON x.depute_id = d.id
      GROUP BY d.id`,
};
