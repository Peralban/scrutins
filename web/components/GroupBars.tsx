import { NEUTRAL, fmt, pct } from "@/lib/format";

export type BarRow = { sigle: string; nom: string; couleur: string | null; votes_exprimes: number; value: number };

// Horizontal bars from zero, one per group, with the value written at the end of each bar.
export default function GroupBars({ rows, label, max }: { rows: BarRow[]; label: string; max: number }) {
  const W = 960, L = 96, R = 70, row = 30, H = rows.length * row + 24;
  const x = (v: number) => L + (v / max) * (W - L - R);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      {[0, 1, 2, 3, 4, 5].map((t) => {
        const v = (max / 5) * t;
        return (
          <g key={t}>
            <line className="grid" x1={x(v)} x2={x(v)} y1={0} y2={H - 20} />
            <text x={x(v)} y={H - 4} textAnchor="middle">{Math.round(v)}</text>
          </g>
        );
      })}
      {rows.map((r, i) => {
        const y = i * row + 5, w = Math.max(x(r.value) - L, 1);
        return (
          <g key={r.sigle}>
            <text x={L - 10} y={y + 14} textAnchor="end">{r.sigle}</text>
            <rect x={L} y={y} width={w} height={18} fill={r.couleur ?? NEUTRAL}
              data-tip={`${r.nom}\n${label} ${pct(r.value)}\n${fmt.format(r.votes_exprimes)} votes exprimés`} />
            <rect x={L} y={y} width={w} height={18} fill="none" stroke="var(--ink)" strokeOpacity={0.25} />
            <text className="val" x={L + w + 8} y={y + 14}>{pct(r.value)}</text>
          </g>
        );
      })}
    </svg>
  );
}
