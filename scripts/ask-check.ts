// Regression cases for the question engine (src/search.ts): `bun scripts/ask-check.ts`.
// Runs against data/scrutins.db, so rebuild it with `bun run ingest` after changing the index.
import { Database } from "bun:sqlite";
import { ask, search } from "../src/search";
import { DB_PATH } from "../src/stats";

const db = new Database(DB_PATH, { readonly: true });
let fail = 0;
const check = (name: string, ok: boolean, got: unknown) => { if (!ok) { fail++; console.log(`FAIL ${name}`, JSON.stringify(got).slice(0, 200)); } };

// Search: typo tolerance, accents, aliases.
check("typo bompar", search(db, "bompar")[0]?.label === "Manuel Bompard", search(db, "bompar")[0]);
check("accents elisabeth", search(db, "elisabeth borne")[0]?.label === "Élisabeth Borne", search(db, "elisabeth borne")[0]);
check("alias renaissance", search(db, "renaissance")[0]?.label === "EPR", search(db, "renaissance")[0]);
check("alias LR", search(db, "LR")[0]?.label === "DR", search(db, "LR")[0]);

// Questions.
const a1 = ask(db, "Le RN vote-t-il comme LR ?").answer;
check("accord RN/LR", a1?.intent === "accord" && a1.a.label === "RN" && a1.b.label === "DR", a1);
const a2 = ask(db, "Qui a voté contre l'aide à mourir ?").answer;
check("qui contre aide à mourir", a2?.intent === "qui_a_vote" && a2.position === "contre", a2);
const a3 = ask(db, "Comment Bompard a voté sur l'aide à mourir ?").answer;
check("Bompard aide à mourir: pour on the whole text", a3?.intent === "vote_texte" && a3.ensemble.length > 0 && a3.ensemble.every((e) => e.position === "pour"), a3);
const a4 = ask(db, "Le RN est-il pour le nucléaire ?").answer;
check("RN nucléaire -> notion", a4?.intent === "notion" && a4.who.label === "RN", a4);
const a5 = ask(db, "LFI et la censure").answer;
check("LFI censure -> direct data", a5?.intent === "notion" && a5.statut === "données directes", a5);
check("plain search has no answer", ask(db, "borne").answer === null, ask(db, "borne"));

const a6 = ask(db, "qu'est ce que la TVA ?");
check("définition TVA", a6.answer?.intent === "definition" && a6.answer.mot.startsWith("TVA"), a6.answer ?? a6.hits[0]);
const a7 = ask(db, "c'est quoi la dissidence").answer;
check("définition dissidence", a7?.intent === "definition" && a7.mot === "Dissidence", a7);
check("pas de bruit sur 'qu'est ce que'", search(db, "qu'est ce que la TVA ?")[0]?.label?.startsWith("TVA") === true, search(db, "qu'est ce que la TVA ?")[0]);

console.log(fail ? `${fail} failing` : "all ok");
process.exit(fail ? 1 : 0);
