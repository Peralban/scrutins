import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import NotionBanner from "@/components/NotionBanner";
import s from "@/components/Notions.module.css";
import { getNotions } from "@/lib/api";

export const metadata: Metadata = { title: "Notions" };

export default function Page() {
  return (
    <section>
      <h2>Notions : les actes, pas les discours</h2>
      <p className="def">
        Pour chaque notion, des amendements ont été classés selon le sens dans lequel ils poussent. Le vote de chaque député (pour, contre) est ensuite lu
        par rapport à ce sens : « favorable » ou « défavorable » à la notion.
      </p>
      <NotionBanner />
      <Suspense fallback={<p className="skeleton">Chargement des notions…</p>}>
        <Cards />
      </Suspense>
    </section>
  );
}

async function Cards() {
  await connection();
  const notions = await getNotions();
  return (
    <div className={s.cards}>
      {notions.map((n) => (
        <Link key={n.id} href={`/notions/${n.id}`} className={s.card}>
          <h3>{n.label}</h3>
          <p>{n.axe}</p>
          <small>{n.statut === "données directes" ? `${n.favorables} scrutins` : `${n.favorables} amendements favorables · ${n.defavorables} défavorables · ${n.ecartes} écartés`}</small>
        </Link>
      ))}
    </div>
  );
}
