import type { Metadata } from "next";
import { Suspense } from "react";
import CarteView from "@/components/CarteView";

export const metadata: Metadata = { title: "Carte" };

export default function Page() {
  return (
    <section>
      <h2>Carte des députés</h2>
      <p className="def">
        <b>Comment lire :</b> un point = un député. <b>Plus deux points sont proches, plus ces deux députés votent de la même façon.</b> Un groupe qui vote en bloc forme un paquet compact ;
        un point loin de son paquet est un député qui vote autrement que son groupe. Clique un point pour voir ses voisins les plus proches.
      </p>
      <Suspense fallback={<p className="skeleton">Chargement de la carte…</p>}>
        <CarteView />
      </Suspense>
      <footer style={{ marginTop: 32 }}>
        Méthode : matrice députés × scrutins (pour +1, abstention 0, contre −1). Une absence est remplacée par la position moyenne du groupe sur ce scrutin, pour qu&apos;elle ne crée pas de distance artificielle ;
        seuls les députés ayant au moins 100 votes enregistrés (15 par thème) sont placés. Par thème, la carte ne porte que sur les scrutins rattachés au thème (voir la page Thèmes pour les règles).
        Les axes n&apos;ont pas de sens propre : seules les distances comptent. Les noms aux extrémités indiquent quels groupes s&apos;y trouvent, pas une étiquette politique. L&apos;orientation est une convention (LFI-NFP à gauche, groupes centraux en haut).
        Les points d&apos;un même groupe se superposent souvent : c&apos;est la discipline de vote.
      </footer>
    </section>
  );
}
