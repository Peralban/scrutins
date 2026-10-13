// Theme classification: keyword rules applied to the title of the legislative text
// a scrutin is about. A scrutin can carry several themes, or none. This is a reading
// aid, not an official taxonomy: extend the rules freely, then run `bun run ingest`.

export type Theme = { id: string; label: string; re: RegExp };

const t = (id: string, label: string, re: RegExp): Theme => ({ id, label, re });

export const THEMES: Theme[] = [
  t("budget", "Budget et finances publiques", /loi de finances|finances publiques|comptes de l[’']|programmation des finances|règlement du budget|budget/),
  t("fiscalite", "Fiscalité et impôts", /fiscal|impôt|taxe|taxation|\btva\b|douane|évasion|\bfraude/),
  t("secu", "Protection sociale", /financement de la sécurité sociale|sécurité sociale|protection sociale|solidarité|prestations|allocation|minima sociaux|\brsa\b|précarité|pauvre/),
  t("retraites", "Retraites", /retraite|pension|vieillesse/),
  t("sante", "Santé", /santé|soins|médic|hôpital|hospital|infirmi|patient|maladie|pharmac|fin de vie|palliatif|aide à mourir|dépendance|autonomie|addiction|tabac|alcool/),
  t("travail", "Travail et emploi", /\btravail|emploi|salari|chômage|syndica|apprentissage|formation professionnelle|assurance chômage|rémunération|\bsmic\b/),
  t("economie", "Économie et entreprises", /entreprise|économi|commerce|industri|concurrence|simplification|artisan|consommat|numérique des entreprises|commande publique|banque|assurance(?! chômage)|\bpme\b/),
  t("securite", "Sécurité et police", /sécurité (?!sociale)|police|ordre public|délinquan|terroris|armes?\b|gendarmerie|vidéoprotection|narcotrafic|stupéfiant|drogue|criminalité|radicalis|tranquillité/),
  t("justice", "Justice et pénal", /justice|pénal|peine|prison|carcéral|magistrat|judiciaire|procédure|mineurs? délinquants|récidive|détention|tribunal|avocat/),
  t("immigration", "Immigration et nationalité", /immigration|étrangers?|asile|nationalité|séjour|réfugi|migrat|intégration|naturalis/),
  t("ecologie", "Écologie et climat", /climat|environnement|écolog|biodiversité|pollution|\beau\b|assainissement|inondation|déchets?|\bplastique|zéro artificialisation|artificialisation|transition énergétique|sobriété|carbone|zones à faibles émissions|\bzfe\b|nature|forêt|incendie|animaux|animal|faune|chasse|espèces/),
  t("energie", "Énergie", /énergie|nucléaire|électri|hydrogène|renouvelable|éolien|photovoltaïque|\bgaz\b|carburant|pétrole|hydrocarbure|\bmines?\b/),
  t("agriculture", "Agriculture et alimentation", /agricol|agricult|alimentation|élevage|pêche|viticol|\bvin\b|paysan|pesticide|phytosanitaire|sécheresse|agriculteur|souveraineté alimentaire/),
  t("logement", "Logement et urbanisme", /logement|urbanisme|loyer|habitat|hlm|locataire|bailleur|copropriété|immobilier|squat|construction/),
  t("education", "Éducation et recherche", /école|éducation|enseignement|universit|recherche|étudiant|scolaire|élèves?|professeur|jeunesse|laïcité à l[’']école|périscolaire/),
  t("institutions", "Institutions et élections", /élection|scrutin|constitution|institution|collectivités|parlement|territorial|démocrati|référendum|mode d[’']élection|\bélu|statut de l[’']élu|décentralis|communes?\b|conseil municipal|intercommunal|\bmaires?\b/),
  t("defense", "Défense et affaires étrangères", /défense|armée|militaire|armement|programmation militaire|\botan\b|ukraine|russie|international|étranger(?!s)|diplomat|coopération|\bpaix\b|conflit|palestin|israël|gaza/),
  t("europe", "Europe et traités", /union européenne|européen|traité|accord |convention|protocole|ratification|approbation de l[’']accord|\bue\b|mercosur/),
  t("numerique", "Numérique et médias", /numérique|internet|média|audiovisuel|données|intelligence artificielle|réseaux sociaux|plateformes?|presse|télévision|cyber|communication/),
  t("culture", "Culture, sport et associations", /culture|culturel|sport|olympi|patrimoine (?:culturel|historique|architectural|naturel)|associati|bénévol|\bartiste|cinéma|livre|langue|musée|spectacle/),
  t("outremer", "Outre-mer et territoires", /outre-mer|mayotte|calédonie|guyane|guadeloupe|martinique|réunion|polynésie|corse|montagne|littoral|ruralité|rural/),
  t("famille", "Famille, égalité et société", /famille|enfant|égalité|discrimination|violences?|femmes?|handicap|parité|filiation|parentalité|adoption|mariage|genre|racisme|antisémit|harcèlement|protection de l[’']enfance|proches aidants/),
  t("transports", "Transports", /transport|ferroviaire|mobilité|routier|aérien|\bsncf\b|autoroute|véhicule|permis de conduire|aéroport|maritime|port\b/),
  t("gouvernement", "Gouvernement et censure", /^la motion de censure|^la déclaration du gouvernement|^la demande de|^la motion de rejet|^la motion référendaire|engage[a-z ]* sa responsabilité|confiance au gouvernement/),
];

// Where the text title starts inside a scrutin title.
const TEXTE = /(proposition de loi|projet de loi|proposition de résolution|projet de résolution|proposition de loi organique|projet de loi organique|proposition de loi constitutionnelle|projet de loi constitutionnelle)/;

export type Parsed = { texte: string | null; etape: string | null; kind: "ensemble" | "amendement" | "article" | "motion" | "autre" };

export function parseTitre(titre: string): Parsed {
  const m = TEXTE.exec(titre);
  let texte: string | null = null;
  let etape: string | null = null;
  if (m) {
    texte = titre.slice(m.index).trim().replace(/\.$/, "");
    const tail = /\s*\(([^()]*(?:lecture|commission mixte|mixte paritaire|conclusions)[^()]*)\)\s*$/i.exec(texte);
    if (tail) { etape = tail[1]; texte = texte.slice(0, tail.index).trim(); }
  }
  const t0 = titre.toLowerCase();
  const kind: Parsed["kind"] =
    /^l[’']ensemble/.test(t0) ? "ensemble"
    : /^(l[’']|les )?amendements?\b|^l[’']amendement/.test(t0) ? "amendement"
    : /^(l[’']article|les articles|l[’']alinéa|le paragraphe|la division|la disposition|le sous-amendement)/.test(t0) ? "article"
    : /^la (motion|déclaration)/.test(t0) ? "motion"
    : "autre";
  return { texte, etape, kind };
}

export function themesOf(titre: string, texte: string | null): string[] {
  const haystack = (texte ?? titre).toLowerCase();
  return THEMES.filter((th) => th.re.test(haystack)).map((th) => th.id);
}
