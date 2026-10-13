// "What does this word mean?" for a word selected on the site.
// Order: our own glossary (it knows the site's terms), then the French Wiktionary for ordinary words.
// The browser only talks to our API; the word, and nothing else, is sent to Wiktionary from here.
import { mots, norm } from "./search";

export type Definition =
  | { source: "glossaire"; mot: string; defs: string[]; site: string | null; href: string }
  | { source: "wiktionnaire"; mot: string; nature: string | null; defs: string[]; href: string }
  | { source: null; mot: string };

const WIKI = "https://fr.wiktionary.org/w/api.php";
const cache = new Map<string, Definition>();

const clean = (s: string) => s
  .replace(/\{\{[^{}]*\}\}/g, "").replace(/\{\{[^{}]*\}\}/g, "")
  .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1").replace(/'{2,}/g, "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

// Only an exact match on an entry's name (with or without its parenthesised acronym): a loose match would
// give "taxe" the entry for the TVA. Everything else goes to the dictionary.
const keys = (m: { id: string; mot: string }) => {
  const bare = norm(m.mot.replace(/\s*\([^)]*\)/g, ""));
  return [m.id, norm(m.mot), bare, ...[...m.mot.matchAll(/\(([^)]+)\)/g)].map((x) => norm(x[1]))].map((k) => k.replace(/s$/, ""));
};
function fromGlossaire(word: string): Definition | null {
  const w = norm(word).replace(/s$/, "");
  const m = mots().find((x) => keys(x).some((k) => k === w || k === w.replace(/\./g, "-")));
  return m ? { source: "glossaire", mot: m.mot, defs: [m.def], site: m.site ?? null, href: `/glossaire#${m.id}` } : null;
}

async function fromWiktionnaire(word: string): Promise<Definition | null> {
  const url = `${WIKI}?action=parse&page=${encodeURIComponent(word)}&prop=wikitext&format=json&redirects=1`;
  const r: any = await fetch(url, { signal: AbortSignal.timeout(4000), headers: { "User-Agent": "scrutins (definitions of selected words)" } }).then((x) => x.json()).catch(() => null);
  const text: string | undefined = r?.parse?.wikitext?.["*"];
  if (!text) return null;
  // Only the French section, and in it the first part of speech that has definitions.
  const fr = text.split(/^== \{\{langue\|/m).find((s) => s.startsWith("fr}}"));
  if (!fr) return null;
  const lines = fr.split("\n");
  let nature: string | null = null;
  const defs: string[] = [];
  for (const l of lines) {
    const h = l.match(/^=== \{\{S\|([^}|]+)/);
    if (h) { if (defs.length) break; nature = ["etymologie", "étymologie", "prononciation"].includes(h[1]) ? null : h[1]; continue; }
    if (nature && /^# /.test(l)) { const d = clean(l.slice(2)); if (d) defs.push(d); }
  }
  return defs.length ? { source: "wiktionnaire", mot: word, nature, defs: defs.slice(0, 4), href: `https://fr.wiktionary.org/wiki/${encodeURIComponent(word)}` } : null;
}

export async function define(raw: string): Promise<Definition> {
  const word = raw.trim().replace(/^[\s«"'’(]+|[\s»"'’).,;:!?]+$/g, "").toLowerCase().slice(0, 60);
  if (!word || word.split(/\s+/).length > 3) return { source: null, mot: word };
  const hit = cache.get(word);
  if (hit) return hit;
  const res = fromGlossaire(word) ?? (await fromWiktionnaire(word)) ?? { source: null as null, mot: word };
  if (res.source || cache.size < 5000) cache.set(word, res);
  return res;
}
