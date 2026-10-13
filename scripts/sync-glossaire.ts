// Builds web/content/glossaire.json from the shared glossary (repo glossaire-politique) plus this site's own
// notes (web/content/glossaire-site.json: "sur ce site" and worked examples, keyed by entry id).
//   bun scripts/sync-glossaire.ts [path/to/glossaire.json]
import { existsSync } from "node:fs";

const SHARED = process.argv[2] ?? new URL("../../glossaire-politique/glossaire.json", import.meta.url).pathname;
if (!existsSync(SHARED)) { console.error(`shared glossary not found: ${SHARED}`); process.exit(1); }
const shared = await Bun.file(SHARED).json();
const site: Record<string, { site?: string; ex?: string }> = await Bun.file(new URL("../web/content/glossaire-site.json", import.meta.url)).json();
const ids = new Set(shared.mots.map((m: { id: string }) => m.id));
for (const k of Object.keys(site)) if (!ids.has(k)) console.warn(`glossaire-site.json: « ${k} » is not in the shared glossary`);

const out = { categories: shared.categories, mots: shared.mots.map((m: { id: string }) => ({ ...m, ...site[m.id] })) };
await Bun.write(new URL("../web/content/glossaire.json", import.meta.url), JSON.stringify(out, null, 2) + "\n");
console.log(`glossaire: ${out.mots.length} entries (${Object.keys(site).length} with site notes)`);
