// The glossary: shared entries from the glossaire-politique package, plus this site's own notes
// (web/content/glossaire-site.json: "sur ce site" and worked examples, keyed by entry id).
import { avecNotes } from "glossaire-politique";
import notes from "../web/content/glossaire-site.json";

export type NoteSite = { site?: string; ex?: string };
export const glossaire = avecNotes<NoteSite>(notes);
