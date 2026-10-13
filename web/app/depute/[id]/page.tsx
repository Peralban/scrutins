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
import type { DeputeData, DeputeNotion } from "@/lib/types";
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
      <Body d={d} notions={notions} />
    </>
  );
}

function Identity({ d }: { d: DeputeData }) {
  const g = d.groupe_actuel;
  return (
    <>
      <title>{`${d.depute.prenom} ${d.depute.nom}`}</title>
      <div className={s.id}>
        <div>
          <h2>{d.depute.prenom} {d.depute.nom}</h2>
          <div style={{ marginTop: 8 }}>
            {d.groupes.map((x) => (
              <span key={x.id}>
                <span className={s.chip}><i style={{ background: x.couleur ?? NEUTRAL }} />{x.sigle}</span>
                <span className={s.tl}>{x.debut} → {x.fin} </span>
              </span>
            ))}
          </div>
        </div>
        <div className={s.tl}>
          <Link href={`/accords?depute=${d.depute.id}`}>qui vote comme lui →</Link><br />
          <a href={`https://www.assemblee-nationale.fr/dyn/deputes/${encodeURIComponent(d.depute.id)}`} target="_blank" rel="noopener noreferrer">fiche sur assemblee-nationale.fr ↗</a><br />
          {d.siege ? `siège n°${d.siege.place}` : "siège inconnu"} · {g.nom}
        </div>
      </div>
    </>
  );
}

function Body({ d, notions }: { d: DeputeData; notions: DeputeNotion[] }) {
  const pres = (100 * d.span.positions) / d.span.scrutins;
  return (
    <>
      {d.stat && d.stat.votes_exprimes === 0 && (
        <p className={`def ${s.notice}`}>
          Aucun vote exprimé (pour, contre, abstention) : les {d.span.positions} positions enregistrées sont des non-votes, entre le {d.span.debut} et le {d.span.fin}. Les chiffres ci-dessous ne portent que sur ces positions.
        </p>
      )}
      <div className="kpis">
        <div className="kpi"><b>{fmt.format(d.span.positions)}</b><span>positions enregistrées</span></div>
        <div className="kpi"><b>{pct(pres)}</b><span>présence aux scrutins</span></div>
        <div className="kpi"><b>{pct(d.stat?.dissidence)}</b><span>dissidence</span></div>
        <div className="kpi"><b>{pct(d.stat?.delegation)}</b><span>votes par délégation</span></div>
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
        <p className="def">Votes d&apos;ensemble exprimés. Barre : part de « pour » du député ; trait orange : part de « pour » de son groupe actuel ({d.groupe_actuel.sigle}) sur les mêmes thèmes.</p>
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
        Dissidence : vote exprimé différent de la position majoritaire du groupe sur le même scrutin. Elle inclut les amendements que le député a lui-même déposés ou cosignés.
        Présence : positions enregistrées rapportées aux scrutins tenus entre son premier et son dernier vote ; les votes par délégation y comptent.
        Les écarts par thème reposent sur peu de votes d&apos;ensemble : lire l&apos;effectif <i>n</i>.
      </footer>
    </>
  );
}
