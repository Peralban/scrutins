import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import DataTable from "@/components/DataTable";
import GroupBars from "@/components/GroupBars";
import NotionBanner from "@/components/NotionBanner";
import NotionDeputes from "@/components/NotionDeputes";
import s from "@/components/Notions.module.css";
import { getNotion } from "@/lib/api";
import { pct } from "@/lib/format";
import type { NotionDetail } from "@/lib/types";

export const metadata: Metadata = { title: "Notion" };

export default function Page({ params }: PageProps<"/notions/[id]">) {
  return (
    <Suspense fallback={<p className="skeleton">Chargement de la notion…</p>}>
      <Notion params={params} />
    </Suspense>
  );
}

async function Notion({ params }: { params: PageProps<"/notions/[id]">["params"] }) {
  const { id } = await params;
  await connection();
  const d = await getNotion(id);
  if ("error" in d) notFound();
  return <Body d={d} />;
}

function Body({ d }: { d: NotionDetail }) {
  const direct = d.notion.statut === "données directes";
  const rows = d.groupes
    .map((g) => ({ ...g, n: g.favorables + g.defavorables }))
    .filter((g) => g.n >= 5)
    .map((g) => ({ sigle: g.sigle, nom: g.nom, couleur: g.couleur, votes_exprimes: g.n, value: +((100 * g.favorables) / g.n).toFixed(1), g }))
    .sort((a, b) => b.value - a.value);
  const retenus = d.votes.filter((v) => v.sens !== 0);
  const ecartes = d.votes.filter((v) => v.sens === 0);

  return (
    <>
      <title>{`${d.notion.label} · Scrutins`}</title>
      <p><Link href="/notions" className={s.back}>← toutes les notions</Link></p>
      <h2 style={{ fontSize: 20 }}>{d.notion.label}</h2>
      <p className={s.axe}>{d.notion.axe}</p>
      <NotionBanner statut={d.notion.statut} />

      <section>
        <h2>Par groupe</h2>
        {direct ? (
          <>
            <p className="def">Nombre de votes « pour » la censure, par groupe, sur les {retenus.length} motions. Pour une motion de censure, seuls les votes « pour » sont enregistrés : les autres députés ne votent pas.</p>
            <DataTable rows={[...d.groupes].sort((a, b) => b.favorables - a.favorables)} cols={[["Groupe", (g) => g.sigle], ["Votes pour la censure", (g) => g.favorables]]} />
          </>
        ) : (
          <>
            <p className="def">Part des votes « favorables » parmi les votes favorables et défavorables sur les {retenus.length} amendements retenus. Abstentions non comptées. Groupes à moins de 5 votes masqués.</p>
            <div className="card"><GroupBars rows={rows} label="part favorable" max={100} /></div>
            <DataTable rows={rows} cols={[["Groupe", (r) => r.sigle], ["Favorables", (r) => r.g.favorables], ["Défavorables", (r) => r.g.defavorables], ["Abstentions", (r) => r.g.abstentions], ["% favorable", (r) => pct(r.value)]]} />
          </>
        )}
      </section>

      <section>
        <h2>Par député</h2>
        <p className="def">Chaque vote exprimé sur un amendement retenu compte une fois. Un clic sur un nom ouvre sa page.</p>
        <NotionDeputes deputes={d.deputes} direct={direct} />
      </section>

      <section>
        <h2>{direct ? `Les motions (${retenus.length})` : `Les amendements retenus (${retenus.length})`}</h2>
        <p className="def">Sens +1 : l&apos;amendement va dans le sens favorable de la notion ; −1 : dans le sens défavorable. Un vote « pour » soutient ce sens, « contre » s&apos;y oppose.</p>
        <VoteTable votes={retenus} />
      </section>

      {!direct && <section>
        <h2>Les amendements écartés ({ecartes.length})</h2>
        <p className="def">Trouvés par mots-clés mais laissés de côté : hors sujet, texte déclaratif sans effet, ou direction non tranchée sur l&apos;extrait lu.</p>
        <VoteTable votes={ecartes} />
      </section>}

      <footer>{d.notion.methode}</footer>
    </>
  );
}

function VoteTable({ votes }: { votes: NotionDetail["votes"] }) {
  return (
    <div className="scroll">
      <table>
        <thead><tr><th>Date</th><th>Sens</th><th>Amendement</th><th>Pour / contre / abst.</th><th>Confiance</th></tr></thead>
        <tbody>
          {votes.map((v) => (
            <tr key={v.id} className={v.sens === 0 ? s.ecarte : undefined}>
              <td>{v.date}</td>
              <td className={`${s.sens} ${v.sens > 0 ? s.pour : v.sens < 0 ? s.contre : s.vide}`}>{v.sens > 0 ? "+1" : v.sens < 0 ? "−1" : "0"}</td>
              <td className={s.t}>
                <Link href={`/hemicycle?id=${v.id}`}>{v.titre.slice(0, 160)}</Link>
                <span className={s.note}>{v.note} · <a href={`https://www.assemblee-nationale.fr/dyn/17/scrutins/${v.numero}`} target="_blank" rel="noopener noreferrer">fiche ↗</a></span>
              </td>
              <td>{v.pour} / {v.contre} / {v.abstentions}</td>
              <td>{v.confiance}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
