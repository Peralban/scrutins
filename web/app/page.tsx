import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import Ask from "@/components/Ask";
import { getHier, getOverview } from "@/lib/api";
import { fmt } from "@/lib/format";
import type { Hier } from "@/lib/types";

const DAY = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const short = (t: string) => {
  const s = t.replace(/^(proposition|projet) de (loi|résolution)( organique| constitutionnelle| européenne)?\s+((visant|tendant|relative?|portant|pour|sur|autorisant)\S*\s+)?(à |au |aux |l[’']|la |le |les |de |du |des )?/i, "");
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export default function Page() {
  return (
    <div className="home">
      <section className="home-main">
        <p className="eyebrow">Assemblée nationale · XVIIe législature</p>
        <h1 className="home-title">Comment vote l&apos;Assemblée&nbsp;?</h1>
        <Suspense fallback={<p className="lede">Les votes publics de la législature, député par député.</p>}>
          <Lede />
        </Suspense>
        <Ask />
        <div className="doors">
          <Link href="/depute" className="door"><b>Les députés</b><span>Présence, votes, écarts avec leur groupe.</span><small>fiches →</small></Link>
          <Link href="/groupes" className="door"><b>Les groupes</b><span>Discipline, accords, qui vote avec qui.</span><small>groupes →</small></Link>
          <Link href="/notions" className="door"><b>Les notions</b><span>23 sujets lus amendement par amendement.</span><small>notions →</small></Link>
        </div>
      </section>
      <aside className="home-aside">
        <Suspense fallback={<p className="skeleton">Chargement des derniers votes…</p>}>
          <Yesterday />
        </Suspense>
      </aside>
    </div>
  );
}

async function Lede() {
  await connection();
  const ov = await getOverview();
  return <p className="lede">Les {fmt.format(ov.scrutins)} votes publics de la législature, député par député. Des chiffres, des définitions, des sources. Pas de commentaire.</p>;
}

async function Yesterday() {
  await connection();
  const h: Hier = await getHier();
  return (
    <>
      <p className="eyebrow">Dernière séance · {DAY.format(new Date(h.date + "T12:00:00"))}</p>
      <h2 className="aside-title">{h.scrutins} scrutin{h.scrutins > 1 ? "s" : ""} à l&apos;Assemblée</h2>
      <ul className="hier">
        {h.textes.map((t) => {
          const v = t.vote, n = v ? v.pour + v.contre + v.abstentions || 1 : 1;
          return (
            <li key={t.titre}>
              <Link href={`/hemicycle?id=${t.id}`}>
                <span className="hier-head">
                  <span>{short(t.titre)}</span>
                  <b className={v ? (v.sort === "adopté" ? "pos-pour" : "pos-contre") : undefined}>{v ? v.sort : `${t.scrutins} votes`}</b>
                </span>
                {v && (
                  <span className="hier-bar" aria-hidden="true">
                    <i style={{ width: `${(100 * v.pour) / n}%`, background: "var(--pour)" }} />
                    <i style={{ width: `${(100 * v.contre) / n}%`, background: "var(--contre)" }} />
                    <i style={{ width: `${(100 * v.abstentions) / n}%`, background: "var(--abst)" }} />
                  </span>
                )}
                <small>{v ? `${v.pour} pour · ${v.contre} contre · ${v.abstentions} abst.${v.kind === "ensemble" ? "" : ` · ${v.kind}`}` : "articles et amendements · voir le détail"}</small>
              </Link>
            </li>
          );
        })}
      </ul>
      <Link href="/hemicycle" className="more-link">Tous les votes →</Link>
    </>
  );
}
