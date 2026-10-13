// "What does this word mean?" for a word selected on the site: our own glossary only.
// An exact match on an entry's name, with or without its acronym (trouver() in glossaire-politique).
// No outside dictionary: a general dictionary gives the general sense ("assemblée" as any assembly),
// not the one used on this site. A loose match would give "taxe" the TVA.
import { nettoyer } from "glossaire-politique";
import { glossaire } from "./glossaire";

export type Definition =
  | { source: "glossaire"; mot: string; defs: string[]; contexte: string | null; site: string | null; sources: { nom: string; url: string }[]; href: string }
  | { source: null; mot: string };

export function define(raw: string): Definition {
  const word = nettoyer(raw).slice(0, 60);
  if (!word || word.split(/\s+/).length > 3) return { source: null, mot: word };
  const m = glossaire.trouver(word);
  return m
    ? { source: "glossaire", mot: m.mot, defs: [m.def], contexte: m.contexte ?? null, site: m.site ?? null, sources: m.sources, href: `/glossaire#${m.id}` }
    : { source: null, mot: word };
}
