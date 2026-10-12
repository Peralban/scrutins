"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useId, useMemo, useState } from "react";
import { useApi } from "@/lib/client";
import { NEUTRAL, pct } from "@/lib/format";
import type { CarteData } from "@/lib/types";
import s from "./Carte.module.css";

const median = (a: number[]) => [...a].sort((u, v) => u - v)[Math.floor(a.length / 2)];
const halo = { fontWeight: 600, paintOrder: "stroke", stroke: "var(--surface)", strokeWidth: 4 } as const;

export default function CarteView() {
  const router = useRouter();
  const params = useSearchParams();
  const scope = params.get("scope") ?? "all";
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [focus, setFocus] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const names = useId();

  const { data } = useApi<CarteData>(`carte?scope=${scope}`);
  const view = useMemo(() => {
    if (!data || !data.points) return null;
    const pts = data.points;
    const color = Object.fromEntries(data.groupes.map((g) => [g.sigle, g.couleur ?? NEUTRAL]));
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    const [x0, x1] = [Math.min(...xs), Math.max(...xs)], [y0, y1] = [Math.min(...ys), Math.max(...ys)];
    const W = 960, H = 600, P = 30, k = Math.min((W - 2 * P) / (x1 - x0 || 1), (H - 2 * P) / (y1 - y0 || 1));
    const cx = W / 2 - ((x0 + x1) / 2) * k, cy = H / 2 + ((y0 + y1) / 2) * k;
    const by: Record<string, typeof pts> = {};
    for (const p of pts) (by[p.groupe ?? "?"] ??= []).push(p);
    return { pts, color, W, H, P, X: (v: number) => cx + v * k, Y: (v: number) => cy - v * k, by };
  }, [data]);

  if (!data || !view) return <p className="skeleton">Chargement de la carte…</p>;
  const { pts, color, W, H, P, X, Y, by } = view;

  // Group names on their block (median position) and, at the axis ends, the groups sitting there.
  const cen = Object.entries(by).filter(([g, a]) => a.length >= 4 && !hidden.has(g))
    .map(([g, a]) => ({ g, x: median(a.map((p) => p.x)), y: median(a.map((p) => p.y)) }));
  const ends = (key: "x" | "y", sign: 1 | -1) => [...cen].sort((u, v) => sign * (v[key] - u[key])).slice(0, 2).map((c) => c.g).join(" · ");

  const f = focus ? pts.find((p) => p.id === focus) : undefined;
  const side = (() => {
    if (!f) return null;
    const own = by[f.groupe ?? "?"] ?? [];
    const cx0 = own.length ? median(own.map((p) => p.x)) : f.x, cy0 = own.length ? median(own.map((p) => p.y)) : f.y;
    const typical = own.length ? median(own.map((p) => Math.hypot(p.x - cx0, p.y - cy0))) : 0;
    const near = pts.filter((p) => p.id !== f.id).map((p) => ({ ...p, d: Math.hypot(p.x - f.x, p.y - f.y) })).sort((u, v) => u.d - v.d).slice(0, 6);
    return { dist: Math.hypot(f.x - cx0, f.y - cy0), typical, near };
  })();

  const counts: Record<string, number> = {};
  for (const p of pts) counts[p.groupe ?? "?"] = (counts[p.groupe ?? "?"] ?? 0) + 1;

  return (
    <>
      <div className="tools">
        <select value={data.meta.scope} onChange={(e) => { setFocus(null); router.replace(`/carte?scope=${e.target.value}`, { scroll: false }); }}>
          {data.scopes.map((x) => <option key={x.scope} value={x.scope}>{x.label} ({x.scrutins} scrutins)</option>)}
        </select>
        <input className={s.search} type="search" list={names} placeholder="repérer un député" autoComplete="off" value={typed}
          onChange={(e) => { setTyped(e.target.value); const p = pts.find((q) => q.nom === e.target.value); if (p) setFocus(p.id); }} />
        <datalist id={names}>{pts.map((p) => <option key={p.id} value={p.nom} />)}</datalist>
        <span>{data.meta.deputes} députés · axe horizontal {pct(100 * data.meta.var1)} de la variance, vertical {pct(100 * data.meta.var2)}</span>
      </div>

      <div className="card">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Carte des députés">
          <line className="grid" x1={X(0)} x2={X(0)} y1={0} y2={H} />
          <line className="grid" x1={0} x2={W} y1={Y(0)} y2={Y(0)} />
          {pts.filter((p) => !hidden.has(p.groupe ?? "?")).map((p) => {
            const on = focus === p.id;
            return (
              <circle key={p.id} cx={X(p.x)} cy={Y(p.y)} r={on ? 9 : 5.5} fill={color[p.groupe ?? "?"] ?? NEUTRAL}
                fillOpacity={focus && !on ? 0.35 : 0.85} stroke={on ? "var(--ink)" : "var(--surface)"} strokeWidth={on ? 2.5 : 1}
                style={{ cursor: "pointer" }} data-tip={`${p.nom}\n${p.groupe ?? ""} · ${p.votes} votes exprimés`}
                onClick={() => { setFocus(p.id); setTyped(p.nom); }} />
            );
          })}
          {cen.map((c) => <text key={c.g} className="val" x={X(c.x)} y={Y(c.y) - 14} textAnchor="middle" style={halo}>{c.g}</text>)}
          <text x={P} y={H - 8}>← {ends("x", -1)}</text>
          <text x={W - P} y={H - 8} textAnchor="end">{ends("x", 1)} →</text>
          <text x={P} y={16}>↑ {ends("y", 1)}</text>
          <text x={P} y={H - 26}>↓ {ends("y", -1)}</text>
          {f && <text className="val" x={X(f.x) + 14} y={Y(f.y) + 16} style={halo}>{f.nom}</text>}
        </svg>
      </div>

      <div className={s.legend}>
        {Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([g, n]) => (
          <button key={g} aria-pressed={!hidden.has(g)}
            onClick={() => setHidden((h) => { const next = new Set(h); if (next.has(g)) next.delete(g); else next.add(g); return next; })}>
            <i style={{ background: color[g] ?? NEUTRAL }} />{g} {n}
          </button>
        ))}
      </div>

      {f && side && (
        <div className={`card ${s.side}`}>
          <b>{f.nom}</b> · {f.groupe} · {f.votes} votes exprimés · <Link href={`/depute/${f.id}`}>sa page →</Link>
          <p className="def" style={{ margin: "8px 0" }}>
            Distance au centre de son groupe : <b>{side.dist.toFixed(1)}</b>, contre <b>{side.typical.toFixed(1)}</b> pour un membre médian de {f.groupe}. Plus la distance est grande, plus il vote autrement que son groupe.
          </p>
          <div className={s.near}>les plus proches sur la carte :</div>
          {side.near.map((q) => <span key={q.id} className={s.chip}><i style={{ background: color[q.groupe ?? "?"] ?? NEUTRAL }} />{q.nom} · {q.groupe}</span>)}
        </div>
      )}
    </>
  );
}
