import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import ThemesHeat from "@/components/ThemesHeat";
import { getThemes } from "@/lib/api";
import { fmt } from "@/lib/format";

export const metadata: Metadata = { title: "Thèmes" };

export default function Page() {
  return (
    <Suspense fallback={<p className="skeleton">Chargement des thèmes…</p>}>
      <Themes />
    </Suspense>
  );
}

async function Themes() {
  await connection();
  const [ensemble, tous] = await Promise.all([getThemes("ensemble"), getThemes("tous")]);
  return (
    <>
      <section>
        <h2>Profil de vote par thème</h2>
        <p className="def">Part de « pour » parmi les votes exprimés de chaque groupe (pour, contre, abstention), sur les scrutins rattachés au thème. « Pour » signifie un vote favorable au texte soumis, pas au thème : voter pour un texte classé « Écologie » ne dit pas s&apos;il protège ou dégrade l&apos;environnement (pour une lecture orientée, voir les notions). Un clic sur un thème ouvre ses scrutins dans l&apos;hémicycle.</p>
        <ThemesHeat data={{ ensemble, tous }} />
      </section>
      <footer>
        Le thème d&apos;un scrutin est déduit par mots-clés dans l&apos;intitulé du texte de loi concerné ; un scrutin peut avoir plusieurs thèmes ou aucun.
        C&apos;est une aide de lecture, pas une classification officielle. Sur les amendements, « pour » dépend de qui les dépose : préférer les votes sur l&apos;ensemble.
        {" "}Scrutins sans thème : {fmt.format(ensemble.non_classes.n)} sur {fmt.format(ensemble.non_classes.total)}.
      </footer>
    </>
  );
}
