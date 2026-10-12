// A notion is a question on which an amendment can push one way or the other
// ("does this text favour nuclear power?"). Candidate amendments are found by keywords in
// their text; the DIRECTION of each vote (which way "pour" pushes) is labelled by hand in
// notions/<id>.json, with a one-line justification, so every score can be audited.

export type Notion = {
  id: string;
  label: string;
  /** What "favorable" means for this notion: the pole a +1 label stands for. */
  axe: string;
  /** Matched against the amendment's statement of reasons and wording, lowercased. */
  include: RegExp;
  /** A candidate is dropped when this matches (keeps the keyword hits that are off-topic). */
  exclude?: RegExp;
  /** Minimum number of keyword hits in the text for a candidate to be kept. */
  minHits: number;
};

export const NOTIONS: Notion[] = [
  {
    id: "nucleaire",
    label: "Nucléaire",
    axe: "Favorable : développer, maintenir ou faciliter l'énergie nucléaire. Défavorable : la réduire, la plafonner ou la conditionner.",
    include: /\b(nucléaires?|réacteurs?|électronucléaire|uranium|epr2?|fessenheim|cogéma|orano|enrichissement de l[’']uranium)\b/g,
    // Military uses and the victims of nuclear tests are a different question from nuclear power.
    exclude: /dissuasion nucléaire|essais nucléaires|armes? nucléaires?|arsenal nucléaire|non-prolifération|bombes? nucléaires?|sous-marins? nucléaires?|force océanique|programmation militaire/,
    minHits: 2,
  },
  {
    id: "ecologie",
    label: "Écologie et climat",
    axe: "Favorable : renforcer les exigences ou les moyens environnementaux et climatiques. Défavorable : les alléger, les repousser ou les supprimer.",
    include: /\b(climat(ique)?s?|biodiversité|gaz à effet de serre|transition (écologique|énergétique)|pesticides?|artificialisation|zones? à faibles émissions|écologique|décarbon\w+|émissions? de (co2|carbone)|néonicotinoïdes?|glyphosate)\b/g,
    exclude: /\bclimat (social|des affaires)\b/,
    minHits: 2,
  },
  {
    id: "immigration",
    label: "Immigration",
    axe: "Favorable : faciliter l'entrée, le séjour, la régularisation ou l'accueil des étrangers. Défavorable : les restreindre ou durcir les conditions (expulsion, durée, quotas, déchéance).",
    include: /\b(immigration|immigrés?|titres? de séjour|demandeurs? d[’']asile|droit d[’']asile|oqtf|régularisation|droit du sol|ressortissants? étrangers?|étrangers? en situation (irrégulière|régulière)|expulsion des étrangers|nationalité française|regroupement familial)\b/g,
    minHits: 2,
  },
  {
    id: "retraites",
    label: "Retraites",
    axe: "Favorable : abaisser l'âge de départ, augmenter les pensions ou les droits à la retraite. Défavorable : reculer l'âge, durcir les conditions ou baisser les pensions.",
    include: /\b(retraites?|âge légal|âge de départ|pensions? de retraite|régimes? de retraite|assurance vieillesse|durée de cotisation|retraités?)\b/g,
    minHits: 2,
  },
];
