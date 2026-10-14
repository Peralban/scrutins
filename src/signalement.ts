// Reports on the glossary ("this definition is wrong", "this word is missing"), sent from the site's form.
// The API opens the GitHub issue itself, so readers need no GitHub account: same label as the issue form
// of the glossary repository (.github/ISSUE_TEMPLATE/signalement.yml).
// Needs GITHUB_TOKEN: a fine-grained token limited to that repository, with "Issues: read and write".
import { glossaire } from "./glossaire";

export const PROBLEMES = [
  "Définition inexacte ou dépassée",
  "Définition incomplète ou peu claire",
  "Définition pas neutre",
  "Source manquante, cassée ou qui ne dit pas ça",
  "Mot manquant",
  "Autre",
] as const;

const DEPOT = process.env.SIGNALEMENT_DEPOT ?? "Peralban/glossaire-politique";
const LIMITES = { mot: 80, explication: 3000, source: 500, page: 200 };

export type Signalement = { id: string | null; mot: string; probleme: (typeof PROBLEMES)[number]; explication: string; source: string | null; page: string | null };
export type Reponse = { ok: true; numero: number; url: string } | { ok: false; erreur: string };

const texte = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// Checks what the form sent. `site_web` is a honeypot: hidden from people, filled by bots.
export function lire(body: Record<string, unknown>): Signalement | { erreur: string; robot?: true } {
  if (texte(body.site_web, 10)) return { erreur: "refusé", robot: true };
  const probleme = PROBLEMES.find((p) => p === body.probleme);
  if (!probleme) return { erreur: "Choisis un type de problème." };
  const entree = typeof body.id === "string" ? glossaire.parId(body.id) : undefined;
  if (body.id && !entree) return { erreur: "Ce mot n'existe pas dans le glossaire." };
  const mot = entree?.mot ?? texte(body.mot, LIMITES.mot);
  if (!mot) return { erreur: "Indique le mot concerné." };
  const explication = texte(body.explication, LIMITES.explication);
  if (explication.length < 10) return { erreur: "Explique en quelques mots ce qui ne va pas." };
  const source = texte(body.source, LIMITES.source);
  if (source && !/^https?:\/\/\S+$/.test(source)) return { erreur: "La source doit être un lien (https://…)." };
  const page = texte(body.page, LIMITES.page);
  return { id: entree?.id ?? null, mot, probleme, explication, source: source || null, page: page.startsWith("/") ? page : null };
}

// What readers write goes into a public issue: "@name" would notify that GitHub user, so it is broken up.
const neutre = (s: string) => s.replace(/@(?=[\w-])/g, "@​");

export function issue(s: Signalement) {
  const lignes = [
    `**Mot** : ${neutre(s.mot)}${s.id ? ` (\`${s.id}\`)` : ""}`,
    `**Type de problème** : ${s.probleme}`,
    ...(s.page ? [`**Page** : \`${s.page}\``] : []),
    "",
    "### Ce qui ne va pas",
    "",
    neutre(s.explication),
    ...(s.source ? ["", "### Source proposée", "", s.source] : []),
    "",
    "---",
    "_Envoyé depuis le formulaire de signalement de scrutins._",
  ];
  return { title: `[signalement] ${neutre(s.mot)} : ${s.probleme}`, body: lignes.join("\n"), labels: ["signalement"] };
}

// A few reports per address, and a ceiling for everyone, so the form cannot flood the repository.
const PAR_IP = 5, GLOBAL = 40, FENETRE = 60 * 60 * 1000;
const envois = new Map<string, number[]>();
export function tropDeSignalements(ip: string, maintenant = Date.now()): boolean {
  const recent = (k: string) => (envois.get(k) ?? []).filter((t) => maintenant - t < FENETRE);
  const moi = recent(ip), tous = recent("*");
  if (moi.length >= PAR_IP || tous.length >= GLOBAL) return true;
  envois.set(ip, [...moi, maintenant]);
  envois.set("*", [...tous, maintenant]);
  return false;
}

export async function signaler(body: Record<string, unknown>, ip: string): Promise<{ status: number; reponse: Reponse }> {
  const s = lire(body);
  // A bot gets the same answer as a person, so it has no reason to try again.
  if ("robot" in s) return { status: 200, reponse: { ok: true, numero: 0, url: "" } };
  if ("erreur" in s) return { status: 400, reponse: { ok: false, erreur: s.erreur } };
  const token = process.env.GITHUB_TOKEN;
  if (!token) return { status: 503, reponse: { ok: false, erreur: "Le signalement n'est pas encore configuré sur ce serveur." } };
  if (tropDeSignalements(ip)) return { status: 429, reponse: { ok: false, erreur: "Trop de signalements envoyés : réessaie dans une heure." } };
  const r = await fetch(`https://api.github.com/repos/${DEPOT}/issues`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "scrutins" },
    body: JSON.stringify(issue(s)),
  }).catch(() => null);
  if (!r?.ok) {
    console.error("signalement: GitHub a répondu", r?.status, await r?.text().catch(() => ""));
    return { status: 502, reponse: { ok: false, erreur: "L'envoi a échoué. Réessaie un peu plus tard." } };
  }
  const { number, html_url } = (await r.json()) as { number: number; html_url: string };
  return { status: 201, reponse: { ok: true, numero: number, url: html_url } };
}
