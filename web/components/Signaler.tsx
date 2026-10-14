"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import s from "./Signaler.module.css";

// Same list as src/signalement.ts, which checks it again on the server.
const PROBLEMES = [
  "Définition inexacte ou dépassée",
  "Définition incomplète ou peu claire",
  "Définition pas neutre",
  "Source manquante, cassée ou qui ne dit pas ça",
  "Mot manquant",
  "Autre",
];

type Reponse = { ok: true; numero: number; url: string } | { ok: false; erreur: string };
type Etat = { etape: "saisie" | "envoi" } | { etape: "envoye"; url: string } | { etape: "erreur"; erreur: string };

// "Signaler" button and its panel: the reader describes the problem, the API opens the GitHub issue.
// With an entry, the report is about that entry; without one, it is a missing word (`manquant` pre-fills it).
export default function Signaler({ entree, manquant, children }: { entree?: { id: string; mot: string }; manquant?: string; children?: React.ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [ouvert, setOuvert] = useState(false);
  const [etat, setEtat] = useState<Etat>({ etape: "saisie" });
  const ouvrir = () => { setEtat({ etape: "saisie" }); setOuvert(true); };
  const fermer = () => dialog.current?.close();
  // Mounted only while open, in <body>: the button may sit inside a paragraph, where a dialog is not allowed.
  useEffect(() => { if (ouvert) dialog.current?.showModal(); }, [ouvert]);

  const envoyer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const champs = Object.fromEntries(new FormData(e.currentTarget));
    setEtat({ etape: "envoi" });
    const r: Reponse = await fetch("/api/signalement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...champs, id: entree?.id, page: location.pathname + location.hash }),
    }).then((x) => x.json()).catch(() => ({ ok: false, erreur: "L'envoi a échoué. Vérifie ta connexion et réessaie." }));
    setEtat(r.ok ? { etape: "envoye", url: r.url } : { etape: "erreur", erreur: r.erreur });
  };

  const titre = entree ? `Signaler un problème sur « ${entree.mot} »` : "Signaler un mot manquant";
  return (
    <>
      <button type="button" className={s.ouvrir} onClick={ouvrir}>{children ?? "Signaler un problème"}</button>
      {ouvert && createPortal(
      <dialog ref={dialog} className={s.panel} aria-label={titre} onClose={() => setOuvert(false)} onClick={(e) => { if (e.target === dialog.current) fermer(); }}>
        <div className={s.inner}>
          <button type="button" className={s.x} aria-label="Fermer" onClick={fermer}>×</button>
          <h2>{titre}</h2>
          {etat.etape === "envoye" ? (
            <div className={s.merci}>
              <p>Merci, c&apos;est envoyé. Le signalement sera relu avant toute correction : une définition ne change que sur la foi d&apos;une source officielle.</p>
              {etat.url && <p><a href={etat.url} target="_blank" rel="noreferrer">Suivre le signalement sur GitHub</a></p>}
              <button type="button" className={s.envoyer} onClick={fermer}>Fermer</button>
            </div>
          ) : (
            <form onSubmit={envoyer}>
              {entree
                ? <input type="hidden" name="mot" value={entree.mot} />
                : <label>Mot à ajouter<input name="mot" required maxLength={80} defaultValue={manquant} placeholder="ex. superprofits" /></label>}
              <label>Type de problème
                <select name="probleme" required defaultValue={entree ? "" : "Mot manquant"}>
                  {entree && <option value="" disabled>Choisir…</option>}
                  {PROBLEMES.filter((p) => (entree ? p !== "Mot manquant" : true)).map((p) => <option key={p}>{p}</option>)}
                </select>
              </label>
              <label>{entree ? "Ce qui ne va pas" : "Où l'as-tu entendu, et que veut-il dire selon toi ?"}
                <textarea name="explication" required minLength={10} maxLength={3000} rows={5}
                  placeholder={entree ? "Qu'est-ce qui est faux ou manque ? Qu'est-ce qu'il faudrait écrire ?" : "ex. employé par un député dans un débat sur le budget…"} />
              </label>
              <label>Source officielle <span>(facultatif)</span>
                <input name="source" type="url" maxLength={500} placeholder="https://www.vie-publique.fr/…" />
              </label>
              {/* Honeypot: invisible to people, filled in by bots. */}
              <input name="site_web" tabIndex={-1} autoComplete="off" className={s.pot} aria-hidden="true" />
              <p className={s.note}>Le signalement est publié sur la page GitHub du glossaire, sans ton nom ni ton adresse. N&apos;y mets pas d&apos;informations personnelles.</p>
              {etat.etape === "erreur" && <p className={s.erreur} role="alert">{etat.erreur}</p>}
              <div className={s.actions}>
                <button type="button" onClick={fermer}>Annuler</button>
                <button type="submit" className={s.envoyer} disabled={etat.etape === "envoi"}>{etat.etape === "envoi" ? "Envoi…" : "Envoyer"}</button>
              </div>
            </form>
          )}
        </div>
      </dialog>, document.body)}
    </>
  );
}
