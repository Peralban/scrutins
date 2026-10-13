import { Suspense } from "react";
import { connection } from "next/server";
import DataTable from "@/components/DataTable";
import DeputesTable from "@/components/DeputesTable";
import GroupBars from "@/components/GroupBars";
import Monthly from "@/components/Monthly";
import { getDeputes, getGroupes, getMensuel, getOverview } from "@/lib/api";
import { fmt, pct } from "@/lib/format";

export const metadata = { title: "Statistiques" };

export default function Page() {
  return (
    <>
      <h1 className="page-title">Statistiques</h1>
      <p className="sub">Assemblée nationale · XVIIe législature · votes publics nominatifs</p>
      <Suspense fallback={<p className="skeleton">Chargement des statistiques…</p>}>
        <Stats />
      </Suspense>
    </>
  );
}

async function Stats() {
  await connection();
  const [ov, groupes, mois, deputes] = await Promise.all([getOverview(), getGroupes(), getMensuel(), getDeputes()]);

  const diss = groupes.map((g) => ({ ...g, value: +(100 - g.cohesion).toFixed(1) })).sort((a, b) => a.value - b.value);
  const part = groupes.map((g) => ({ ...g, value: g.participation })).sort((a, b) => b.value - a.value);
  const niceMax = (v: number[]) => Math.ceil(Math.max(...v) / 5) * 5;

  return (
    <>
      <div className="kpis">
        <div className="kpi"><b>{fmt.format(ov.scrutins)}</b><span>scrutins</span></div>
        <div className="kpi"><b>{fmt.format(ov.votes)}</b><span>positions nominatives</span></div>
        <div className="kpi"><b>{pct((100 * ov.adoptes) / ov.scrutins)}</b><span>adoptés</span></div>
        <div className="kpi"><b style={{ fontSize: 17, lineHeight: "39px" }}>{ov.du.slice(0, 7)} → {ov.au.slice(0, 7)}</b><span>période</span></div>
      </div>

      <section>
        <h2>Dissidence par groupe</h2>
        <p className="def">Part des votes exprimés (pour, contre, abstention) contraires à la position majoritaire du groupe sur le même scrutin. Scrutins sans majorité nette exclus.</p>
        <div className="card"><GroupBars rows={diss} label="dissidence" max={niceMax(diss.map((g) => g.value))} /></div>
        <DataTable rows={diss} cols={[["Groupe", (g) => g.sigle], ["Nom", (g) => g.nom], ["Votes exprimés", (g) => fmt.format(g.votes_exprimes)], ["Dissidence", (g) => pct(g.value)]]} />
      </section>

      <section>
        <h2>Participation par groupe</h2>
        <p className="def">Votes exprimés rapportés aux places du groupe (effectif déclaré × scrutins). Un député absent n&apos;apparaît pas dans le décompte nominatif.</p>
        <div className="card"><GroupBars rows={part} label="participation" max={niceMax(part.map((g) => g.value))} /></div>
        <DataTable rows={part} cols={[["Groupe", (g) => g.sigle], ["Nom", (g) => g.nom], ["Places", (g) => fmt.format(g.places)], ["Participation", (g) => pct(g.value)]]} />
      </section>

      <section>
        <h2>Scrutins par mois</h2>
        <p className="def">Nombre de scrutins publics selon le sort : adopté ou rejeté.</p>
        <div className="card"><Monthly rows={mois} /></div>
        <DataTable rows={mois} cols={[["Mois", (r) => r.mois], ["Total", (r) => r.total], ["Adoptés", (r) => r.adoptes], ["Rejetés", (r) => r.rejetes]]} />
      </section>

      <section>
        <h2>Députés</h2>
        <p className="def">Taux de dissidence individuel. « Délégation » : part des votes exprimés par délégation.</p>
        <DeputesTable deputes={deputes} />
      </section>

      <footer>
        Source : data.assemblee-nationale.fr (Scrutins, AMO10, AMO30), licence ouverte. Les chiffres sont calculés sans pondération ni jugement.
        <br />Groupe « UDR (réf. antérieure) » : ancienne référence du groupe Union des droites pour la République, renommé en septembre 2025.
      </footer>
    </>
  );
}
