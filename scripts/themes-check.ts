// Regression cases for the keyword rules in src/themes.ts: `bun scripts/themes-check.ts`.
// Each case is a real (or realistic) text title and the themes it must, or must not, get.
import { themesOf } from "../src/themes";

const cases: [string, string[], string[]][] = [
  // [title, must have, must not have]
  ["proposition de loi relative à l'organisation, à la gestion et au financement du sport professionnel", ["culture"], ["transports"]],
  ["projet de loi visant à offrir des réponses immédiates aux phénomènes troublant l'ordre public", ["securite"], ["numerique"]],
  ["proposition de loi visant à empêcher la constitution de monopoles économiques dans le secteur des médias", ["numerique"], ["agriculture"]],
  ["proposition de loi visant à renforcer la solidarité envers les retraités pauvres", ["secu"], ["europe"]],
  ["proposition de loi visant à accorder le versement des allocations familiales dès le premier enfant", ["secu"], ["logement"]],
  ["proposition de loi relative à l'établissement de l'égalité d'accès au service public postal", [], ["famille"]],
  ["projet de loi portant transposition de l'avenant au protocole d'accord sur l'assurance chômage", ["travail"], ["europe"]],
  ["proposition de loi visant à renforcer la sécurité, la rétention administrative et la prévention des risques d'attentat", ["securite", "immigration"], []],
  ["proposition de loi pour retrouver la confiance et l'équilibre dans les rapports locatifs", ["logement"], []],
  ["proposition de loi visant à autoriser la chasse des espèces protégées", ["ecologie"], []],
  ["projet de loi autorisant la ratification du traité entre la France et l'Italie", ["europe"], []],
];

let fail = 0;
for (const [title, yes, no] of cases) {
  const got = themesOf(title, title);
  const bad = [...yes.filter((t) => !got.includes(t)).map((t) => `missing ${t}`), ...no.filter((t) => got.includes(t)).map((t) => `unexpected ${t}`)];
  if (bad.length) { fail++; console.log(`FAIL ${bad.join(", ")} <- ${title} [${got.join(",")}]`); }
}
console.log(fail ? `${fail} / ${cases.length} failing` : `${cases.length} cases ok`);
process.exit(fail ? 1 : 0);
