import type { Database } from "bun:sqlite";

// 2D map of deputies: principal component analysis of the vote matrix
// (pour = +1, abstention = 0, contre = -1). A deputy's missing vote (absence) is replaced
// by the mean expressed position of their group on that scrutin, so absences do not
// create artificial distance. Only deputies with enough real votes are plotted.

const MIN_SCRUTINS_THEME = 30;
const MIN_VOTES_ALL = 100;
const MIN_VOTES_THEME = 15;

type Row = { s: string; d: string; g: string; p: string };

export function computeCartes(db: Database) {
  const scr = db.query(`SELECT id FROM scrutin ORDER BY date, numero`).all() as { id: string }[];
  const deps = db.query(`SELECT id FROM depute`).all() as { id: string }[];
  const grps = db.query(`SELECT id, sigle FROM groupe`).all() as { id: string; sigle: string }[];
  const S = scr.length, N = deps.length, G = grps.length;
  const sIdx = new Map(scr.map((x, i) => [x.id, i]));
  const dIdx = new Map(deps.map((x, i) => [x.id, i]));
  const gIdx = new Map(grps.map((x, i) => [x.id, i]));

  const X = new Float32Array(N * S).fill(NaN);
  const GA = new Int8Array(N * S).fill(-1); // group of the deputy at each scrutin they voted
  const gsum = new Float64Array(G * S), gcnt = new Float64Array(G * S);
  const rows = db.query(`SELECT scrutin_id s, depute_id d, groupe_id g, position p FROM vote
                         WHERE position IN ('pour','contre','abstention')`).iterate() as Iterable<Row>;
  for (const r of rows) {
    const si = sIdx.get(r.s)!, di = dIdx.get(r.d)!, gi = gIdx.get(r.g)!;
    const v = r.p === "pour" ? 1 : r.p === "contre" ? -1 : 0;
    X[di * S + si] = v; GA[di * S + si] = gi;
    gsum[gi * S + si] += v; gcnt[gi * S + si]++;
  }

  // Group of a deputy on a scrutin they missed: nearest scrutin they voted on (forward, then backward).
  const real = new Uint8Array(N * S);
  for (let i = 0; i < N * S; i++) real[i] = Number.isNaN(X[i]) ? 0 : 1;
  const filled = new Int8Array(GA);
  for (let d = 0; d < N; d++) {
    const o = d * S; let last = -1;
    for (let s = 0; s < S; s++) { if (filled[o + s] >= 0) last = filled[o + s]; else filled[o + s] = last; }
    last = -1;
    for (let s = S - 1; s >= 0; s--) { if (filled[o + s] >= 0) last = filled[o + s]; else if (filled[o + s] < 0) filled[o + s] = last; }
  }
  const imputed = new Float32Array(N * S);
  for (let d = 0; d < N; d++) for (let s = 0; s < S; s++) {
    const i = d * S + s;
    if (real[i]) imputed[i] = X[i];
    else { const g = filled[i]; imputed[i] = g >= 0 && gcnt[g * S + s] > 0 ? gsum[g * S + s] / gcnt[g * S + s] : 0; }
  }

  const sigle = (g: number) => grps[g].sigle;
  const mainGroup = (d: number) => { const c = new Map<number, number>(); for (let s = 0; s < S; s++) { const g = GA[d * S + s]; if (g >= 0) c.set(g, (c.get(g) ?? 0) + 1); } return [...c].sort((a, b) => b[1] - a[1])[0]?.[0] ?? -1; };
  const dGroup = Array.from({ length: N }, (_, d) => mainGroup(d));

  db.exec(`DROP TABLE IF EXISTS carte; DROP TABLE IF EXISTS carte_meta;
    CREATE TABLE carte (scope TEXT NOT NULL, depute_id TEXT NOT NULL, x REAL NOT NULL, y REAL NOT NULL, votes INTEGER NOT NULL);
    CREATE INDEX carte_scope ON carte (scope);
    CREATE TABLE carte_meta (scope TEXT PRIMARY KEY, var1 REAL, var2 REAL, scrutins INTEGER, deputes INTEGER);`);
  const insP = db.prepare("INSERT INTO carte VALUES (?,?,?,?,?)");
  const insM = db.prepare("INSERT INTO carte_meta VALUES (?,?,?,?,?)");

  const themeScrutins = new Map<string, number[]>();
  for (const r of db.query(`SELECT scrutin_id s, theme_id t FROM scrutin_theme`).all() as { s: string; t: string }[]) {
    (themeScrutins.get(r.t) ?? themeScrutins.set(r.t, []).get(r.t)!).push(sIdx.get(r.s)!);
  }
  const scopes: [string, number[], number][] = [["all", Array.from({ length: S }, (_, i) => i), MIN_VOTES_ALL]];
  for (const [t, cols] of themeScrutins) if (cols.length >= MIN_SCRUTINS_THEME) scopes.push([t, cols, MIN_VOTES_THEME]);

  db.transaction(() => {
    for (const [scope, cols, minVotes] of scopes) {
      const members: number[] = [];
      for (let d = 0; d < N; d++) { let n = 0; for (const s of cols) n += real[d * S + s]; if (n >= minVotes) members.push(d); }
      if (members.length < 20) continue;
      const n = members.length, c = cols.length;
      const A = new Float32Array(n * c);
      members.forEach((d, i) => cols.forEach((s, j) => { A[i * c + j] = imputed[d * S + s]; }));
      for (let j = 0; j < c; j++) { let m = 0; for (let i = 0; i < n; i++) m += A[i * c + j]; m /= n; for (let i = 0; i < n; i++) A[i * c + j] -= m; }
      let total = 0; for (let i = 0; i < A.length; i++) total += A[i] * A[i];

      const coords: Float64Array[] = [], vars: number[] = [];
      for (let k = 0; k < 2; k++) {
        let u = Float64Array.from({ length: n }, (_, i) => Math.sin(i * 12.9898 + k * 78.233));
        const w = new Float64Array(c); let sigma = 0;
        for (let it = 0; it < 150; it++) {
          w.fill(0);
          for (let i = 0; i < n; i++) { const ui = u[i], o = i * c; for (let j = 0; j < c; j++) w[j] += A[o + j] * ui; }
          const nu = new Float64Array(n); let norm = 0;
          for (let i = 0; i < n; i++) { let a = 0; const o = i * c; for (let j = 0; j < c; j++) a += A[o + j] * w[j]; nu[i] = a; norm += a * a; }
          norm = Math.sqrt(norm); for (let i = 0; i < n; i++) nu[i] /= norm; u = nu; sigma = Math.sqrt(norm);
        }
        w.fill(0);
        for (let i = 0; i < n; i++) { const ui = u[i], o = i * c; for (let j = 0; j < c; j++) w[j] += A[o + j] * ui; }
        for (let i = 0; i < n; i++) { const ui = u[i], o = i * c; for (let j = 0; j < c; j++) A[o + j] -= ui * w[j]; }
        coords.push(Float64Array.from(u, (x) => x * sigma)); vars.push((sigma * sigma) / total);
      }
      // Sign convention only: left-of-hemicycle groups on the left, central groups above.
      const mean = (xs: Float64Array, names: string[]) => { let s = 0, m = 0; members.forEach((d, i) => { if (names.includes(sigle(dGroup[d]))) { s += xs[i]; m++; } }); return m ? s / m : NaN; };
      const L = mean(coords[0], ["LFI-NFP"]), R = mean(coords[0], ["RN"]);
      if (L > R) for (let i = 0; i < n; i++) coords[0][i] = -coords[0][i];
      const C = mean(coords[1], ["EPR", "DEM", "HOR"]), E = mean(coords[1], ["LFI-NFP", "RN"]);
      if (C < E) for (let i = 0; i < n; i++) coords[1][i] = -coords[1][i];

      members.forEach((d, i) => insP.run(scope, deps[d].id, coords[0][i], coords[1][i], cols.reduce((a, s) => a + real[d * S + s], 0)));
      insM.run(scope, vars[0], vars[1], c, n);
    }
  })();
}
