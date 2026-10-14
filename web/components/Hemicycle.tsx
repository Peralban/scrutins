"use client";

import { useRouter } from "next/navigation";
import { NEUTRAL } from "@/lib/format";
import { layout } from "@/lib/hemicycle";
import type { HemicycleData, Position } from "@/lib/types";

const LABEL: Record<Position, string> = { pour: "pour", contre: "contre", abstention: "abstention", non_votant: "non-votant", absent: "absent" };

// `voters`: draw only the deputies who took part (absent seats left out).
export default function Hemicycle({ data, voters = false }: { data: HemicycleData; voters?: boolean }) {
  const router = useRouter();
  const { scrutin: s, seats } = data;
  const color = Object.fromEntries(data.groupes.map((g) => [g.id, g.couleur ?? NEUTRAL]));
  const sigle = Object.fromEntries(data.groupes.map((g) => [g.id, g.sigle]));
  const { pts, spacing, arc, R } = layout(seats.length);
  const W = 960, M = 70, cx = W / 2, cy = 500, scale = 450, dot = Math.min(spacing, arc) * scale * 0.42;

  const labels: Record<string, number[]> = {};
  seats.forEach((seat, i) => (labels[seat.groupe] ??= []).push(pts[i].a));

  return (
    // Margins leave room for the group labels, which sit outside the arc.
    <svg viewBox={`${-M} ${-M / 2} ${W + 2 * M} ${cy + 30 + M / 2}`} role="img" aria-label={`Hémicycle, un point par siège : ${s.pour} pour, ${s.contre} contre, ${s.abstentions} abstentions, ${s.votants} votants`}>
      {seats.map((seat, i) => {
        const p = pts[i], x = cx + Math.cos(p.a) * p.r * scale, y = cy - Math.sin(p.a) * p.r * scale;
        const pos = seat.position;
        // In voters mode an absent seat is hidden, but the group's edge dot on the outer row stays.
        const hidden = voters && pos === "absent";
        // An absent seat is a small pale dot so the votes stand out; abstention and non-votant stay rings.
        const fill = pos === "pour" ? "var(--pour)" : pos === "contre" ? "var(--contre)" : pos === "absent" ? "var(--line)" : "none";
        // A ring has no fill: pointerEvents="all" below keeps its inside hoverable, not just its edge.
        const stroke = pos === "abstention" || pos === "non_votant" ? "var(--abst)" : "none";
        return (
          <g key={seat.id}>
            <circle cx={x} cy={y} r={pos === "absent" ? dot * 0.4 : dot} fill={fill} stroke={stroke} visibility={hidden ? "hidden" : undefined}
              strokeWidth={dot > 7 ? 2 : 1.5} strokeDasharray={pos === "non_votant" ? "2 2" : undefined} pointerEvents={hidden ? "none" : "all"} style={{ cursor: "pointer" }}
              data-tip={`${seat.nom}\n${sigle[seat.groupe] ?? ""} · ${LABEL[pos]}${seat.delegation ? " (délégation)" : ""}`}
              onClick={() => router.push(`/depute/${seat.id}`)} />
            {p.row === R - 1 && <circle cx={cx + Math.cos(p.a) * (p.r * scale + dot + 9)} cy={cy - Math.sin(p.a) * (p.r * scale + dot + 9)} r={3.2} fill={color[seat.groupe] ?? NEUTRAL} />}
          </g>
        );
      })}
      {Object.entries(labels).filter(([, as]) => as.length >= 8).map(([g, as]) => {
        // Labels on the sides grow outward (start/end anchor) instead of spilling back over the seats.
        const a = [...as].sort((u, v) => u - v)[Math.floor(as.length / 2)], rad = scale + dot + 22, c = Math.cos(a);
        return <text key={g} x={cx + c * rad} y={cy - Math.sin(a) * rad + 5 * Math.abs(c) - 2} textAnchor={c > 0.25 ? "start" : c < -0.25 ? "end" : "middle"}>{sigle[g]}</text>;
      })}
      <text className="val" x={cx} y={cy - 30} textAnchor="middle" style={{ fontSize: 34, fontWeight: 600 }}>{s.votants}</text>
      <text className="hemi-sub" x={cx} y={cy - 4} textAnchor="middle">votants sur {seats.length}</text>
    </svg>
  );
}
