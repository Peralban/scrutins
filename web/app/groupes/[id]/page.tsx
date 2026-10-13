import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import s from "@/components/Groupe.module.css";
import { getGroupe } from "@/lib/api";
import { MIN_VOTES_VERDICT, NEUTRAL, fmt, pct } from "@/lib/format";
import type { GroupeDetail } from "@/lib/types";

export const metadata: Metadata = { title: "Groupe" };

export default function Page({ params }: PageProps<"/groupes/[id]">) {
  return (
    <Suspense fallback={<p className="skeleton">Chargement du groupe…</p>}>
      <Fiche params={params} />
    </Suspense>
  );
}

async function Fiche({ params }: { params: PageProps<"/groupes/[id]">["params"] }) {
  const { id } = await params;
  await connection();
  const d = await getGroupe(id);
  if ("error" in d) notFound();
  const g = d.groupe;
  const near = d.accords[0], far = d.accords[d.accords.length - 1];
  return (
    <>
      <title>{g.nom}</title>
      <Link href="/groupes" className={s.back}>← Tous les groupes</Link>
      <div className={s.head}>
        <span className={s.swatch} style={{ background: g.couleur ?? NEUTRAL }} />
        <h1 className={s.title}>{g.nom}</h1>
      </div>
      <p className={s.meta}>{g.sigle} · {d.effectif} députés au dernier scrutin · XVIIe législature</p>

      <div className={s.kpis}>
        <div className={s.kpi}><b>{pct(g.cohesion)}</b><span>des votes suivent la ligne du groupe</span><small>{d.rangs.cohesion}{d.rangs.cohesion === 1 ? "er" : "e"} sur {d.groupes}</small></div>
        <div className={s.kpi}><b>{pct(g.participation)}</b><span>de présence aux scrutins</span><small>{d.rangs.participation}{d.rangs.participation === 1 ? "er" : "e"} sur {d.groupes}</small></div>
        {near && far && (
          <div className={s.kpi}><b>{near.sigle} · {Math.round((100 * near.accord) / near.communs)} %</b><span>le groupe avec qui il vote le plus</span>
            <small>le moins : {far.sigle} · {Math.round((100 * far.accord) / far.communs)} %</small></div>
        )}
      </div>

      <div className={s.grid}>
        <Notions d={d} />
        <aside className={s.side}>
          <div className={s.box}>
            <h3>Votent-ils comme ils disent ?</h3>
            <p>Le site mesure ce qu&apos;ils votent, pas ce qu&apos;ils déclarent. Comparer avec leur programme demande de relever leurs positions écrites et de les étiqueter comme les notions : ce n&apos;est pas encore fait, et rien n&apos;est estimé en attendant.</p>
          </div>
          <Members d={d} />
          <div>
            <h3>Avec qui ils votent</h3>
            <p className="def" style={{ margin: "0 0 6px" }}>Même position majoritaire sur les votes d&apos;ensemble.</p>
            {d.accords.map((a) => {
              const p = (100 * a.accord) / a.communs;
              return (
                <Link key={a.id} href={`/groupes/${a.id}`} className={s.acc} data-tip={`${a.nom}\n${a.accord} accords sur ${a.communs} votes`}>
                  <span>{a.sigle}</span><i><b style={{ width: `${p}%`, background: a.couleur ?? NEUTRAL }} /></i><span>{Math.round(p)} %</span>
                </Link>
              );
            })}
          </div>
        </aside>
      </div>

      <section style={{ marginTop: 48 }}>
        <h2>Les {d.membres.length} députés qui y ont siégé</h2>
        <p className="def">Dont {d.effectif} au dernier scrutin. Les autres ont quitté l&apos;Assemblée ou le groupe en cours de législature.</p>
        <ul className={s.members}>
          {d.membres.map((m) => <li key={m.id}><Link href={`/depute/${m.id}`} className={s.person}><span>{m.nom}</span><span>{fmt.format(m.votes_enregistres)} votes</span></Link></li>)}
        </ul>
      </section>
    </>
  );
}

// Notions: favourable share of the group's members' votes, most clear-cut first.
function Notions({ d }: { d: GroupeDetail }) {
  const rows = d.notions.map((n) => {
    const tot = n.favorables + n.defavorables;
    return { ...n, tot, part: tot ? (100 * n.favorables) / tot : null };
  });
  const direct = rows.filter((r) => r.statut === "données directes");
  const ranked = rows.filter((r) => r.statut !== "données directes")
    .sort((a, b) => (a.tot < MIN_VOTES_VERDICT ? 1 : 0) - (b.tot < MIN_VOTES_VERDICT ? 1 : 0) || Math.abs((b.part ?? 50) - 50) - Math.abs((a.part ?? 50) - 50));
  return (
    <section style={{ margin: 0 }}>
      <h2>Ce qu&apos;ils votent, sujet par sujet</h2>
      <p className="def">Part des votes de ses députés allant dans le sens favorable de chaque notion, sur des amendements lus un par un. Les sujets les plus tranchés en premier.</p>
      <span className={s.banner}>Étiquettes en cours de validation · chaque amendement et son sens sont consultables</span>
      <div className={s.nhead}><span>notion</span><span><span>← défavorable</span><span>favorable →</span></span><span style={{ textAlign: "right" }}>part</span></div>
      {ranked.map((r) => {
        if (r.part == null || r.tot < MIN_VOTES_VERDICT)
          return <Link key={r.id} href={`/notions/${r.id}`} className={s.nrow}><span className={s.nlab}>{r.label}</span><span className={s.track} /><span className={s.thin}>trop peu</span></Link>;
        const dlt = r.part - 50, color = r.part >= 67 ? "var(--pour)" : r.part <= 33 ? "var(--contre)" : "var(--abst)";
        return (
          <Link key={r.id} href={`/notions/${r.id}`} className={s.nrow} data-tip={`${r.label}\n${fmt.format(r.favorables)} votes favorables · ${fmt.format(r.defavorables)} défavorables`}>
            <span className={s.nlab}>{r.label}</span>
            <span className={s.track}><span className={s.fill} style={{ background: color, ...(dlt >= 0 ? { left: "50%", width: `${dlt}%` } : { right: "50%", width: `${-dlt}%` }) }} /></span>
            <span className={s.part} style={{ color: r.part >= 67 ? "var(--pour)" : r.part <= 33 ? "var(--contre)" : "var(--ink2)" }}>{Math.round(r.part)} %</span>
          </Link>
        );
      })}
      {direct.map((r) => (
        <p key={r.id} className="def" style={{ marginTop: 14 }}><Link href={`/notions/${r.id}`}>{r.label}</Link> : {fmt.format(r.favorables)} votes de ses députés pour une motion de censure (seuls les votes « pour » sont enregistrés).</p>
      ))}
    </section>
  );
}

function Members({ d }: { d: GroupeDetail }) {
  const actifs = [...d.membres].sort((a, b) => b.votes_enregistres - a.votes_enregistres).slice(0, 4);
  const diss = d.membres.filter((m) => m.votes_enregistres >= 200 && m.dissidence != null).sort((a, b) => b.dissidence! - a.dissidence!).slice(0, 4);
  return (
    <div>
      <h3>Qui sont-ils ?</h3>
      <div className={s.label}>les plus présents</div>
      {actifs.map((m) => <Link key={m.id} href={`/depute/${m.id}`} className={s.person}><span>{m.nom}</span><span>{fmt.format(m.votes_enregistres)} votes</span></Link>)}
      <div className={s.label}>votent le plus souvent contre le groupe</div>
      {diss.map((m) => <Link key={m.id} href={`/depute/${m.id}`} className={s.person}><span>{m.nom}</span><span>{pct(m.dissidence)}</span></Link>)}
    </div>
  );
}
