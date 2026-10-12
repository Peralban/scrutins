import { pct } from "@/lib/format";

// Share of the scrutins held each month for which the deputy has a recorded position.
export default function PresenceChart({ rows }: { rows: { mois: string; scrutins: number; votes: number }[] }) {
  const W = 960, H = 170, L = 40, B = 24, T = 6, bw = (W - L) / rows.length;
  const y = (v: number) => T + (H - T - B) * (1 - v / 100);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Présence par mois">
      {[0, 50, 100].map((v) => <g key={v}><line className="grid" x1={L} x2={W} y1={y(v)} y2={y(v)} /><text x={L - 6} y={y(v) + 4} textAnchor="end">{v}</text></g>)}
      {rows.map((r, i) => {
        const p = Math.min(100, (100 * r.votes) / r.scrutins), x = L + i * bw + 3;
        return (
          <g key={r.mois} data-tip={`${r.mois}\n${r.votes} positions sur ${r.scrutins} scrutins\n${pct(p)}`}>
            <rect x={L + i * bw} y={T} width={bw} height={H - T - B} fill="transparent" />
            <rect x={x} y={y(p)} width={bw - 6} height={Math.max(y(0) - y(p), 1)} fill="var(--pour)" />
            {i % 2 === 0 && <text x={x + (bw - 6) / 2} y={H - 7} textAnchor="middle">{r.mois.slice(2)}</text>}
          </g>
        );
      })}
    </svg>
  );
}
