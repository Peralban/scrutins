"use client";

import { useRouter } from "next/navigation";
import { useId } from "react";
import s from "./Depute.module.css";

export default function DeputeSearch({ deputes }: { deputes: { id: string; nom: string }[] }) {
  const router = useRouter();
  const list = useId();
  const go = (name: string) => {
    const d = deputes.find((x) => x.nom === name);
    if (d) router.push(`/depute/${d.id}`);
  };
  return (
    <div className="tools">
      <input className={s.search} type="search" list={list} placeholder="rechercher un député" autoComplete="off" onChange={(e) => go(e.target.value)} />
      <datalist id={list}>{deputes.map((d) => <option key={d.id} value={d.nom} />)}</datalist>
    </div>
  );
}
