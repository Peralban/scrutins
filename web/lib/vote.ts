// Plain-language reading of one scrutin, built only from its official title, kind and result.
// Every sentence is a fixed template per kind of vote: no summary of the text itself.
import type { ScrutinItem } from "./types";

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const BILL = /^(proposition|projet) de (loi|résolution)( organique| constitutionnelle| européenne)?\s+((visant|tendant|relative?|portant|pour|sur|autorisant)\S*\s+)?(à |au |aux |l[’']|la |le |les |de |du |des )?/i;
// Budget laws keep their name ("Loi de finances pour 2027"): cutting "projet de loi de" would leave "finances pour 2027".
export const shortText = (t: string) =>
  cap((/^(proposition|projet) de loi de (finances|financement)/i.test(t) ? t.replace(/^(proposition|projet) de loi/i, "loi") : t.replace(BILL, "")).replace(/\.$/, ""));

// A vote whose title is the text itself ("la proposition de loi …") is a vote on the whole text.
const wholeText = (titre: string) => /^(la|le) (proposition|projet)\b/i.test(titre);
const kindOf = (s: ScrutinItem) => (s.kind === "autre" && wholeText(s.titre) ? "ensemble" : s.kind);

// What was put to the vote, cut from the official title: "la motion de rejet préalable, déposée par M. X, du
// projet de loi …" -> "Motion de rejet préalable, déposée par M. X"; "l'ensemble" -> "Vote sur l'ensemble".
export function what(titre: string) {
  if (wholeText(titre)) return "Vote sur l'ensemble";
  const head = titre.split(/\s+(?:de la|du|de cette|de l[’']) ?(?:proposition|projet)\b/i)[0].replace(/[.,\s]+$/, "").trim();
  if (/^l[’']ensemble$/i.test(head)) return "Vote sur l'ensemble";
  return cap(head.replace(/^(l[’']|le |la |les )/i, ""));
}

// "motion de rejet préalable", "motion de censure"… when the vote is on a motion.
export const motion = (titre: string) => titre.match(/\bmotion (?:de |d[’'])[a-zéèêàç' ]+?(?=,| déposée| du | de la | sur |\.|$)/i)?.[0].toLowerCase() ?? null;
// "M. Boris Vallaud" -> "Boris Vallaud", from "déposée par M. Boris Vallaud".
export const auteur = (titre: string) => titre.match(/déposée? par (?:M\.|Mme|MM\.)\s+([^,]+?)(?:,| et | du | de la |$)/)?.[1] ?? null;

const done = (sort: string, f: boolean) => (sort === "adopté" ? (f ? "adoptée" : "adopté") : f ? "rejetée" : "rejeté");

// "Motion rejetée", "Amendement adopté", "Texte adopté".
export function verdict(s: ScrutinItem) {
  const k = kindOf(s), f = k === "motion";
  const noun = k === "motion" ? "Motion" : k === "amendement" ? "Amendement" : k === "article" ? "Article" : k === "ensemble" ? "Texte" : null;
  return noun ? `${noun} ${done(s.sort, f)}` : cap(done(s.sort, false));
}

// What the result changes, when that follows from the kind of vote alone.
export function consequence(s: ScrutinItem) {
  const ok = s.sort === "adopté", m = motion(s.titre);
  if (m?.includes("rejet préalable")) return ok ? "le texte est rejeté sans examen de ses articles." : "l'examen du texte continue.";
  if (m?.includes("censure")) return ok ? "le Gouvernement est renversé." : "le Gouvernement reste en place.";
  const k = kindOf(s);
  if (k === "amendement") return ok ? "le texte est modifié." : "le texte reste inchangé sur ce point.";
  if (k === "article") return ok ? "l'article est conservé." : "l'article est supprimé du texte.";
  if (k === "ensemble") return ok ? "l'Assemblée adopte le texte à cette étape." : "l'Assemblée rejette le texte à cette étape.";
  return null;
}

// The vote needed to pass: the majority of the votes cast (pour + contre), except for a motion of censure,
// which needs the absolute majority of the members (only "pour" votes count).
export function majorite(s: ScrutinItem) {
  if (motion(s.titre)?.includes("censure")) return "majorité absolue des membres de l'Assemblée requise";
  const exprimes = s.pour + s.contre;
  return exprimes ? `majorité requise : ${Math.floor(exprimes / 2) + 1} voix sur ${exprimes} suffrages exprimés` : null;
}

export const dateLongue = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
