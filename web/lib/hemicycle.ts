// Parliament layout: rows of seats on concentric half-circles, seats sorted by angle then by
// seat number, so a group's seats form a wedge like in the real chamber (left of the chamber
// on the left of the page).
export type SeatPoint = { r: number; row: number; a: number };

export function layout(n: number) {
  const R = Math.max(5, Math.round(Math.sqrt(n / 4.7)));
  const r0 = 0.42, r1 = 1;
  const radii = Array.from({ length: R }, (_, i) => r0 + (i * (r1 - r0)) / (R - 1));
  const total = radii.reduce((a, b) => a + b, 0);
  const counts = radii.map((r) => Math.round((n * r) / total));
  counts[R - 1] += n - counts.reduce((a, b) => a + b, 0);
  const pts: SeatPoint[] = [];
  radii.forEach((r, i) => {
    for (let j = 0; j < counts[i]; j++) pts.push({ r, row: i, a: counts[i] === 1 ? Math.PI / 2 : (Math.PI * j) / (counts[i] - 1) });
  });
  pts.sort((p, q) => p.a - q.a || p.r - q.r);
  return { pts, R, spacing: (r1 - r0) / (R - 1), arc: (Math.PI * r1) / counts[R - 1] };
}
