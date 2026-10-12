// Shapes returned by the data API (../src/stats.ts).
export type Overview = { scrutins: number; du: string; au: string; votes: number; adoptes: number };
export type GroupeStat = {
  id: string; sigle: string; nom: string; couleur: string | null;
  votes_exprimes: number; places: number; scrutins: number; participation: number; cohesion: number;
};
export type Mois = { mois: string; total: number; adoptes: number; rejetes: number };
export type DeputeRow = {
  id: string; nom: string; groupe: string | null; votes_exprimes: number; dissidence: number | null; delegation: number | null;
};
export type Groupe = { id: string; sigle: string; nom: string; couleur: string | null };
export type ScrutinItem = {
  id: string; numero: number; date: string; kind: string; sort: string; titre: string;
  texte: string | null; etape: string | null; pour: number; contre: number; abstentions: number; votants: number;
};
export type ThemesData = {
  themes: { id: string; label: string; scrutins: number }[];
  groupes: Groupe[];
  cells: { theme_id: string; groupe_id: string; pour: number; contre: number; abstention: number }[];
  non_classes: { n: number; total: number };
};
export type Position = "pour" | "contre" | "abstention" | "non_votant" | "absent";
export type Seat = { place: number; id: string; nom: string; groupe: string; position: Position; delegation: number };
export type HemicycleData = { scrutin: ScrutinItem & { type: string }; seats: Seat[]; groupes: Groupe[] };
export type DeputeData = {
  depute: { id: string; prenom: string; nom: string };
  groupes: (Groupe & { debut: string; fin: string })[];
  groupe_actuel: Groupe;
  siege: { place: number; debut: string; fin: string; votes: number } | null;
  stat: { votes_exprimes: number; dissidence: number | null; delegation: number | null } | null;
  span: { debut: string; fin: string; positions: number; delegues: number; scrutins: number };
  mois: { mois: string; scrutins: number; votes: number }[];
  themes: { id: string; label: string; n: number; pour: number; contre: number; abstention: number; dissidents: number; groupe_pour: number | null }[];
  dissidences: { id: string; date: string; numero: number; kind: string; titre: string; sort: string; position: string; majorite: string; sigle: string }[];
};
export type AccordCell = { a: string; b: string; communs: number; accord: number };
export type Voisin = { id: string; nom: string; groupe: string; communs: number; accord: number; taux: number };
export type AccordDepute = { proches: Voisin[]; eloignes: Voisin[]; candidats: number };
export type AccordDuo = {
  a: { id: string; nom: string }; b: { id: string; nom: string }; communs: number; accord: number; total_desaccords: number;
  desaccords: { id: string; date: string; numero: number; kind: string; titre: string; pa: string; pb: string }[];
};
export type CarteData = {
  meta: { scope: string; var1: number; var2: number; scrutins: number; deputes: number };
  points: { id: string; nom: string; groupe: string | null; x: number; y: number; votes: number }[];
  groupes: { sigle: string; nom: string; couleur: string | null }[];
  scopes: { scope: string; label: string; scrutins: number; deputes: number }[];
};
