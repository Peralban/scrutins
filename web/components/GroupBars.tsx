import { NEUTRAL, fmt, pct } from "@/lib/format";

export type BarRow = { sigle: string; nom: string; couleur: string | null; votes_exprimes: number; value: number };

// Horizontal bars from zero, one per group, with the value written at the end of each bar.
// Plain HTML rather than SVG so labels keep their real font size at any width (an SVG
// viewBox scales its text down with the chart on a phone).
export default function GroupBars({ rows, label, max }: { rows: BarRow[]; label: string; max: number }) {
  const ticks = [0, 1, 2, 3, 4, 5].map((t) => (max / 5) * t);
  return (
    <div className="bars" role="img" aria-label={label}>
      {rows.map((r) => (
        <div className="bar-row" key={r.sigle}
          data-tip={`${r.nom}\n${label} ${pct(r.value)}\n${fmt.format(r.votes_exprimes)} votes exprimés`}>
          <span className="bar-label">{r.sigle}</span>
          <span className="bar-track">
            <i style={{ width: `${Math.max((r.value / max) * 100, 0.5)}%`, background: r.couleur ?? NEUTRAL }} />
            <b>{pct(r.value)}</b>
          </span>
        </div>
      ))}
      <div className="bar-row bar-axis" aria-hidden="true">
        <span className="bar-label" />
        <span className="bar-track">
          {ticks.map((v, i) => <span key={i} style={{ left: `${(i / 5) * 100}%` }}>{Math.round(v)}</span>)}
        </span>
      </div>
    </div>
  );
}
