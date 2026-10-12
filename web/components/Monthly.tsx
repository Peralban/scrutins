import type { Mois } from "@/lib/types";

// Stacked columns per month: adopted (dark) and rejected (light).
export default function Monthly({ rows }: { rows: Mois[] }) {
  const W = 960, H = 260, L = 44, B = 28, T = 8;
  const max = Math.ceil(Math.max(...rows.map((r) => r.total)) / 100) * 100;
  const bw = (W - L) / rows.length, y = (v: number) => T + (H - T - B) * (1 - v / max);
  return (
    <svg viewBox={`0 0 ${W} ${H + 30}`} role="img" aria-label="Scrutins par mois">
      {[0, 1, 2, 3, 4].map((t) => {
        const v = (max / 4) * t;
        return <g key={t}><line className="grid" x1={L} x2={W} y1={y(v)} y2={y(v)} /><text x={L - 6} y={y(v) + 4} textAnchor="end">{v}</text></g>;
      })}
      {rows.map((r, i) => {
        const x = L + i * bw + 2, w = bw - 4;
        return (
          <g key={r.mois} data-tip={`${r.mois}\n${r.total} scrutins\n${r.adoptes} adoptés · ${r.rejetes} rejetés`}>
            <rect x={L + i * bw} y={T} width={bw} height={H - T - B} fill="transparent" />
            <rect x={x} y={y(r.adoptes)} width={w} height={y(0) - y(r.adoptes)} fill="var(--adopte)" />
            <rect x={x} y={y(r.total)} width={w} height={Math.max(y(r.adoptes) - y(r.total) - 2, 0)} fill="var(--rejete)" />
            {i % 3 === 0 && <text x={x + w / 2} y={H - 8} textAnchor="middle">{r.mois.slice(2)}</text>}
          </g>
        );
      })}
      <g transform={`translate(${L},${H + 14})`}>
        <rect width={10} height={10} fill="var(--adopte)" /><text x={16} y={9}>adopté</text>
        <rect x={90} width={10} height={10} fill="var(--rejete)" /><text x={106} y={9}>rejeté</text>
      </g>
    </svg>
  );
}
