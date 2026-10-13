// "What does this word mean?" for a word selected on the site: our own glossary only.
// An exact match on an entry's name, with or without its acronym. No outside dictionary: a general
// dictionary gives the general sense ("assemblée" as any assembly), not the one used on this site.
import { mots, norm } from "./search";

export type Definition =
  | { source: "glossaire"; mot: string; defs: string[]; contexte: string | null; site: string | null; sources: { nom: string; url: string }[]; href: string }
  | { source: null; mot: string };

// Plural and a trailing "s" are ignored ("amendements" finds "Amendement"); a loose match would give "taxe" the TVA.
const keys = (m: { id: string; mot: string }) => {
  const bare = norm(m.mot.replace(/\s*\([^)]*\)/g, ""));
  return [m.id, norm(m.mot), bare, ...[...m.mot.matchAll(/\(([^)]+)\)/g)].map((x) => norm(x[1]))].map((k) => k.replace(/s$/, ""));
};

export function define(raw: string): Definition {
  const word = raw.trim().replace(/^[\s«"'’(]+|[\s»"'’).,;:!?]+$/g, "").slice(0, 60);
  if (!word || word.split(/\s+/).length > 3) return { source: null, mot: word };
  const w = norm(word).replace(/s$/, "");
  const m = mots().find((x) => keys(x).some((k) => k === w || k === w.replace(/\./g, "-")));
  return m
    ? { source: "glossaire", mot: m.mot, defs: [m.def], contexte: m.contexte ?? null, site: m.site ?? null, sources: m.sources ?? [], href: `/glossaire#${m.id}` }
    : { source: null, mot: word };
}
