// Theme classification: keyword rules applied to the title of the legislative text
// a scrutin is about. A scrutin can carry several themes, or none. This is a reading
// aid, not an official taxonomy: extend the rules freely, then run `bun run ingest`.

export type Theme = { id: string; label: string; re: RegExp };

const t = (id: string, label: string, re: RegExp): Theme => ({ id, label, re });

export const THEMES: Theme[] = [
  t("budget", "Budget et finances publiques", /loi de finances|finances publiques|comptes de l[’\']|programmation des finances|règlement du budget|budget|loi spéciale|fin de gestion|opérateurs de l[’\']état/),
  t("fiscalite", "Fiscalité et impôts", /fiscal|impôt|taxe|taxation|\btva\b|douane|évasion|\bfraude/),
  t("secu", "Protection sociale", /financement de la sécurité sociale|sécurité sociale|protection sociale|solidarité|prestations|allocation|minima sociaux|\brsa\b|précarité|pauvre|sans-abri/),
  t("retraites", "Retraites", /retraite|pension|vieillesse/),
  t("sante", "Santé", /santé|soins|médic|médecin|hôpita|hospital|infirmi|patient|maladie|pharmac|fin de vie|palliatif|aide à mourir|dépendance|autonomie|addiction|tabac|vapotage|alcool|sanitaire|cancer|cardio|mortalité infantile|orthophon/),
  t("travail", "Travail et emploi", /\btravail|emploi|salari|chômage|syndica|apprentissage|formation professionnelle|contrat de professionnalisation|rémunération|\bsmic\b|titres?[- ]restaurant/),
  t("economie", "Économie et entreprises", /entreprise|économi|commerce|industri|concurrence|simplification|artisan|consommat|commande publique|banque|bancaire|assurance(?! chômage)|\bpme\b/),
  t("securite", "Sécurité et police", /sécurité (?!sociale|sanitaire|alimentaire|et (?:la )?santé)|police|ordre public|délinquan|terroris|attentat|armes?\b|gendarmerie|vidéoprotection|narcotrafic|stupéfiant|drogue|criminalité|radicalis|tranquillité|sapeurs-pompiers|autorité de l[’\']état/),
  t("justice", "Justice et pénal", /justice|pénal|peine|prison|carcéral|détenu|magistrat|judiciaire|juridiction|procédure|mineurs? délinquants|récidive|détention|tribunal|avocat|plainte|victimes/),
  t("immigration", "Immigration et nationalité", /immigration|étrangers?|asile|nationalité|séjour|réfugi|migrat|intégration|naturalis|rétention administrative|mineurs isolés/),
  t("ecologie", "Écologie et climat", /climat|environnement|écolog|biodiversité|pollution|\beau\b|assainissement|inondation|déchets?|\bplastique|artificialisation|transition énergétique|sobriété|carbone|zones à faibles émissions|\bzfe\b|\bnature\b|forêt|incendie|animaux|animal|faune|chasse|espèces|perfluoro|polyfluoro|\bpfas\b|frelon/),
  t("energie", "Énergie", /énergie|nucléaire|électri|hydrogène|renouvelable|éolien|photovoltaïque|\bgaz\b|carburant|pétrole|hydrocarbure|\bmines?\b/),
  t("agriculture", "Agriculture et alimentation", /agricol|agricult|alimentation|élevage|\bpêche|viticol|\bvignes?\b|\bvin\b|paysan|pesticide|phytosanitaire|sécheresse|apicole|souveraineté alimentaire/),
  t("logement", "Logement et urbanisme", /logement|urbanisme|loyer|\blocati|\bbaux\b|\bbail\b|habitat|hlm|locataire|bailleur|copropriété|immobili|meublés de tourisme|ascen[cs]eur|indivision|indivison|squat|construction|sans-abri/),
  t("education", "Éducation et recherche", /école|éducation|enseignement|universit|\brecherche\b(?! d)|étudiant|scolaire|élèves?|professeur|jeunesse|périscolaire/),
  t("institutions", "Institutions et élections", /élection|scrutin|constitution|institution|collectivités|parlement|territorial|démocrati|référendum|mode d[’\']élection|\bélus?\b|élu local|statut de l[’\']élu|éligibilité|candidats|règlement de l[’\']assemblée|décentralis|communes?\b|conseil municipal|intercommunal|\bmaires?\b/),
  t("defense", "Défense et affaires étrangères", /défense|armée|militaire|armement|programmation militaire|\botan\b|ukraine|russie|international|étranger(?!s)|diplomat|coopération|\bpaix\b|conflit|palestin|israël|gaza/),
  t("europe", "Europe et traités", /union européenne|européen|(?<!mal|re)traités?\b|\baccord (?:commercial|de libre|entre)|convention (?:entre|de|sur|internationale)|protocole(?! d[’\']accord)|ratification|approbation de l[’\']accord|\bue\b|mercosur/),
  t("numerique", "Numérique et médias", /numérique|internet|\bmédias?\b|audiovisuel|données|intelligence artificielle|réseaux sociaux|plateformes?|presse|télévision|cyber|tiktok|communication/),
  t("culture", "Culture, sport et associations", /culture|culturel|sport|olympi|patrimoine (?:culturel|historique|architectural|naturel)|associati|bénévol|\bartiste|cinéma|livre|langue|musée|spectacle/),
  t("outremer", "Outre-mer et territoires", /outre-mer|mayotte|calédonie|guyane|guadeloupe|martinique|réunion|polynésie|corse|montagne|littoral|ruralité|rural/),
  t("famille", "Famille, égalité et société", /famille|enfant|égalité (?!d[’\']accès)|discrimination|violences?|femmes?|handicap|parité|filiation|parentalité|adoption|mariage|devoir conjugal|genre|racisme|antisémit|homosexualité|code noir|harcèlement|protection de l[’\']enfance|proches aidants|mineurs isolés/),
  t("transports", "Transports", /transport|ferroviaire|mobilité|routi|aérien|\bsncf\b|autorout|véhicule|permis de conduire|aéroport|maritime|\bports?\b/),
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
