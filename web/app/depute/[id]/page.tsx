import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import DeputeSearch from "@/components/DeputeSearch";
import Dissidences from "@/components/Dissidences";
import PresenceChart from "@/components/PresenceChart";
import s from "@/components/Depute.module.css";
import { getDepute, getDeputeNotions, getDeputes } from "@/lib/api";
import { NEUTRAL, fmt, pct, verdict } from "@/lib/format";
import type { DeputeData, DeputeNotion, DeputeRow } from "@/lib/types";
import n from "@/components/Notions.module.css";

export const metadata: Metadata = { title: "Député" };

export default function Page({ params }: PageProps<"/depute/[id]">) {
  return (
    <Suspense fallback={<p className="skeleton">Chargement du député…</p>}>
      <Fiche params={params} />
    </Suspense>
  );
}

async function Fiche({ params }: { params: PageProps<"/depute/[id]">["params"] }) {
  const { id } = await params;
  await connection();
  const [d, deputes, notions] = await Promise.all([getDepute(id), getDeputes(), getDeputeNotions(id)]);
  if ("error" in d) notFound();
  return (
    <>
      <DeputeSearch deputes={deputes} />
      <Identity d={d} />
      <Body d={d} notions={notions} deputes={deputes} />
    </>
  );
}

function Identity({ d }: { d: DeputeData }) {
  const g = d.groupe_actuel;
  return (
    <>
      <title>{`${d.depute.prenom} ${d.depute.nom}`}</title>
      <div className={s.id}>
        <div className={s.who}>
          <span className={s.swatch} style={{ background: g.couleur ?? NEUTRAL }} />
          <div>
            <h1 className={s.name}>{d.depute.prenom} {d.depute.nom}</h1>
            <p className={s.sub}>
              <Link href={`/groupes/${g.id}`}>{g.nom}</Link>
              {d.siege ? ` · siège n° ${d.siege.place}` : ""}
            </p>
            {d.groupes.length > 1 && (
              <p className={s.history}>
                {d.groupes.map((x) => (
                  <span key={x.id + x.debut} className={s.chip}><i style={{ background: x.couleur ?? NEUTRAL }} />{x.sigle} <small>{x.debut} → {x.fin}</small></span>
                ))}
              </p>
            )}
          </div>
        </div>
        <div className={s.actions}>
          <Link href={`/accords?depute=${d.depute.id}`} className={s.btn}>Qui vote comme lui ?</Link>
          <a href={`https://www.assemblee-nationale.fr/dyn/deputes/${encodeURIComponent(d.depute.id)}`} target="_blank" rel="noopener noreferrer" className={s.btnGhost}>Fiche officielle ↗</a>
        </div>
      </div>
    </>
  );
}

function Body({ d, notions, deputes }: { d: DeputeData; notions: DeputeNotion[]; deputes: DeputeRow[] }) {
  const pres = (100 * d.span.positions) / d.span.scrutins;
  // Comparison point: the median of the other deputies of the same current group (200+ votes, as on the list).
  const peers = deputes.filter((x) => x.groupe === d.groupe_actuel.sigle && x.id !== d.depute.id && x.votes_enregistres >= 200);
  const median = (v: (number | null)[]) => { const a = v.filter((x): x is number => x != null).sort((p, q) => p - q); return a.length ? a[Math.floor(a.length / 2)] : null; };
  const mDiss = median(peers.map((x) => x.dissidence)), mDel = median(peers.map((x) => x.delegation));
  return (
    <>
      {d.stat && d.stat.votes_enregistres === 0 && (
        <p className={`def ${s.notice}`}>
          Aucun vote enregistré (pour, contre ou abstention) : les {d.span.positions} positions enregistrées sont des non-votes, entre le {d.span.debut} et le {d.span.fin}. Les chiffres ci-dessous ne portent que sur ces positions.
        </p>
      )}
      <div className="kpis">
        <div className="kpi"><b>{pct(pres)}</b><span>de présence aux scrutins</span><small>{fmt.format(d.span.positions)} positions sur {fmt.format(d.span.scrutins)} scrutins de son mandat</small></div>
        <div className="kpi"><b>{pct(d.stat?.dissidence)}</b><span>de ses votes contre la ligne de son groupe</span><small>{mDiss != null ? `médiane ${d.groupe_actuel.sigle} : ${pct(mDiss)}` : "\u00a0"}</small></div>
        <div className="kpi"><b>{pct(d.stat?.delegation)}</b><span>de ses votes par délégation</span><small>{mDel != null ? `médiane ${d.groupe_actuel.sigle} : ${pct(mDel)}` : "\u00a0"}</small></div>
      </div>

      <section>
        <h2>Positions par notion</h2>
        <p className="def">Lecture de ses votes sur des amendements classés par sens (étiquettes en cours de validation). Voter contre un amendement n&apos;est pas toujours voter contre la notion ; le détail est sur la page de chaque notion.</p>
        <div className="scroll">
          <table>
            <thead><tr><th>Notion</th><th>Favorables</th><th>Défavorables</th><th>Abst.</th><th>% favorable</th><th>Lecture</th></tr></thead>
            <tbody>
              {notions.map((x) => {
                const v = verdict(x.favorables, x.defavorables);
                if (x.statut === "données directes") return (
                  <tr key={x.id}>
                    <td className={s.t} data-main=""><Link href={`/notions/${x.id}`}>{x.label}</Link></td>
                    <td data-label="Favorables">{x.favorables}</td><td data-label="" colSpan={4}>motions votées « pour » (seuls les votes pour sont enregistrés)</td>
                  </tr>
                );
                return (
                  <tr key={x.id}>
                    <td className={s.t} data-main=""><Link href={`/notions/${x.id}`}>{x.label}</Link></td>
                    <td data-label="Favorables">{x.favorables}</td><td data-label="Défavorables">{x.defavorables}</td><td data-label="Abst.">{x.abstentions}</td>
                    <td data-label="% favorable">{pct(v.part)}</td><td data-label="Lecture" className={n[v.tone]}>{v.label}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>Présence par mois</h2>
        <p className="def">Positions enregistrées / scrutins tenus ce mois-là, entre le premier et le dernier vote du député.</p>
        <div className="card"><PresenceChart rows={d.mois} /></div>
      </section>

      <section>
        <h2>Profil par thème</h2>
        <p className="def">Votes sur l&apos;ensemble d&apos;un texte, abstentions comprises. Barre : part de « pour » du député ; trait orange : part de « pour » de son groupe actuel ({d.groupe_actuel.sigle}) sur les mêmes thèmes.</p>
        <div className="scroll">
          <table>
            <thead><tr><th>Thème</th><th>n</th><th>Pour</th><th>Contre</th><th>Abst.</th><th>Dissident</th><th>Pour : lui / groupe</th></tr></thead>
            <tbody>
              {d.themes.length === 0 && <tr><td className={s.t} data-main="" colSpan={7}>aucun vote d&apos;ensemble classé</td></tr>}
              {d.themes.map((t) => {
                const p = (100 * t.pour) / t.n;
                return (
                  <tr key={t.id}>
                    <td className={s.t} data-main="">{t.label}</td><td data-label="n">{t.n}</td><td data-label="Pour">{t.pour}</td><td data-label="Contre">{t.contre}</td><td data-label="Abst.">{t.abstention}</td><td data-label="Dissident">{t.dissidents}</td>
                    <td data-label="Pour : lui / groupe">
                      <span className={s.cmp}><b style={{ width: `${p}%` }} />{t.groupe_pour != null && <u style={{ left: `calc(${t.groupe_pour}% - 1px)` }} />}</span>{" "}
                      {p.toFixed(0)} / {t.groupe_pour != null ? t.groupe_pour.toFixed(0) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>Votes contre la majorité du groupe</h2>
        <p className="def">Les 200 plus récents. Un clic ouvre le scrutin dans l&apos;hémicycle.</p>
        <Dissidences id={d.depute.id} initial={d.dissidences} />
      </section>

      <footer>
        Dissidence : vote enregistré (pour, contre ou abstention) différent de la position majoritaire du groupe sur le même scrutin. Elle inclut les amendements que le député a lui-même déposés ou cosignés.
        Présence : positions enregistrées rapportées aux scrutins tenus entre son premier et son dernier vote ; les votes par délégation y comptent.
        Les écarts par thème reposent sur peu de votes d&apos;ensemble : lire l&apos;effectif <i>n</i>.
      </footer>
    </>
  );
}
