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

// Not listed here: `censure` (see notions/censure.json), which needs no keywords: it is the 23 motions of censure themselves.
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

  // ---- Catalogue extension: at least one notion per theme of the Themes page. ----
  {
    id: "fiscalite-capital",
    label: "Fiscalité du capital et des hauts patrimoines",
    axe: "Favorable : alourdir l'imposition du capital, des hauts revenus et des grandes fortunes (ISF, dividendes, superprofits, successions). Défavorable : l'alléger.",
    include: /\b(impôt sur la fortune|isf|ifi|flat tax|prélèvement forfaitaire unique|superprofits?|dividendes?|milliardaires?|hauts revenus|plus-values?|droits? de succession|successions?|taxe zucman|exit tax|niches? fiscales?|patrimoine financier|rachats? d[’']actions)\b/g,
    minHits: 2,
  },
  {
    id: "fiscalite-entreprises",
    label: "Fiscalité et charges des entreprises",
    axe: "Favorable : alléger la fiscalité et les charges des entreprises. Défavorable : les alourdir ou supprimer des allègements.",
    include: /\b(impôts? de production|cvae|impôt sur les sociétés|cotisations patronales|exonérations? de cotisations|allègements? de charges|crédit d[’']impôt (recherche|innovation)|cir\b|taxe sur les entreprises|charges sociales)\b/g,
    minHits: 2,
  },
  {
    id: "prestations-sociales",
    label: "Prestations sociales et minima",
    axe: "Favorable : augmenter, étendre ou protéger les prestations sociales (RSA, APL, allocations, pensions d'invalidité). Défavorable : les réduire, les geler, les conditionner.",
    include: /\b(prestations? sociales?|minima sociaux|rsa|revenu de solidarité active|apl|aides? au logement|allocations? familiales|prime d[’']activité|aah|allocation aux adultes handicapés|revalorisation|année blanche|gel des prestations|indexation|aide médicale d[’']état)\b/g,
    minHits: 2,
  },
  {
    id: "sante-publique",
    label: "Moyens et accès à la santé publique",
    axe: "Favorable : renforcer les moyens de l'hôpital public et l'accès aux soins (remboursements, personnel, déserts médicaux). Défavorable : réduire ces moyens, augmenter la participation des patients ou alléger les obligations.",
    include: /\b(hôpital|hôpitaux|hospitalier|déserts? médicaux?|ondam|remboursement|franchises? médicales?|reste à charge|personnels? soignants?|urgences|médecins? libéraux|dépassements? d[’']honoraires|infirmiers?)\b/g,
    minHits: 2,
  },
  {
    id: "fin-de-vie",
    label: "Aide active à mourir",
    axe: "Favorable : ouvrir ou faciliter l'aide active à mourir. Défavorable : la restreindre, la conditionner davantage ou l'interdire.",
    include: /\b(aide (active )?à mourir|fin de vie|euthanasie|suicide assisté|mourir dans la dignité|directives anticipées)\b/g,
    minHits: 1,
  },
  {
    id: "droits-salaries",
    label: "Droits et protection des salariés",
    axe: "Favorable : renforcer les droits et la protection des salariés (salaire, licenciement, temps de travail, droit syndical, assurance chômage). Défavorable : les assouplir ou les réduire.",
    include: /\b(licenciements?|smic|code du travail|temps de travail|contrat de travail|syndicats?|droit de grève|assurance chômage|allocation chômage|indemnisation (du )?chômage|salaires?|conseil de prud[’']hommes|35 heures)\b/g,
    minHits: 2,
  },
  {
    id: "forces-de-l-ordre",
    label: "Moyens et pouvoirs des forces de l'ordre",
    axe: "Favorable : renforcer les moyens, les pouvoirs ou la protection juridique des forces de l'ordre (police municipale, armement, vidéoprotection, fichiers). Défavorable : les encadrer ou les restreindre.",
    include: /\b(police|policiers?|gendarmes?|gendarmerie|vidéoprotection|reconnaissance faciale|caméras?|drones?|fichiers?|légitime défense|perquisitions?|fouilles?|contrôles? d[’']identité)\b/g,
    minHits: 2,
  },
  {
    id: "severite-penale",
    label: "Sévérité pénale",
    axe: "Favorable : durcir les sanctions et la réponse pénale (peines, mineurs délinquants, détention). Défavorable : les adoucir ou privilégier d'autres réponses.",
    include: /\b(peines? planchers?|peines?|emprisonnement|mineurs? (délinquants?|de moins)|excuse de minorité|détention|récidivistes?|comparution immédiate|perpétuité|réclusion|incarcération)\b/g,
    minHits: 2,
  },
  {
    id: "logement-social",
    label: "Logement social et encadrement des loyers",
    axe: "Favorable : renforcer le logement social et protéger les locataires (loi SRU, encadrement des loyers, trêve hivernale). Défavorable : assouplir ces règles.",
    include: /\b(loi sru|logements? sociaux?|encadrement des loyers|expulsions? locatives?|trêve hivernale|hlm|locataires?|meublés? de tourisme|airbnb|droit au logement|dalo)\b/g,
    minHits: 2,
  },
  {
    id: "ecole-publique",
    label: "Moyens de l'enseignement public",
    axe: "Favorable : renforcer les moyens de l'école et de l'université publiques (postes, effectifs, gratuité, bourses). Défavorable : les réduire ou favoriser le privé.",
    include: /\b(enseignants?|professeurs?|école publique|éducation nationale|effectifs?|enseignement (privé|supérieur)|parcoursup|bourses? (étudiantes?|sur critères)|universit(é|és)|élèves)\b/g,
    minHits: 2,
  },
  {
    id: "democratie-institutions",
    label: "Proportionnelle et démocratie directe",
    axe: "Favorable : ouvrir le système politique (proportionnelle, référendum d'initiative citoyenne, limitation du 49.3, vote blanc). Défavorable : le maintenir fermé ou le renforcer côté exécutif.",
    include: /\b(proportionnelle|référendum|49\.3|article 49|vote blanc|mode de scrutin|initiative citoyenne|représentation proportionnelle|cumul des mandats)\b/g,
    minHits: 1,
  },
  {
    id: "defense",
    label: "Effort militaire",
    axe: "Favorable : augmenter les moyens militaires (budget des armées, matériel, munitions, service national). Défavorable : les réduire ou les plafonner.",
    include: /\b(armées|armée de (terre|l[’']air)|marine nationale|budget de la défense|loi de programmation militaire|lpm|munitions|service national|service militaire|mobilisation|réserve opérationnelle|matériel militaire)\b/g,
    exclude: /dissuasion nucléaire|essais nucléaires/,
    minHits: 2,
  },
  {
    id: "europe",
    label: "Intégration européenne",
    axe: "Favorable : approfondir l'intégration européenne (compétences de l'Union, primauté du droit européen, solidarité financière). Défavorable : limiter les compétences de l'Union ou affirmer la primauté nationale.",
    include: /\b(union européenne|primauté du droit|souveraineté nationale|frexit|traité de lisbonne|institutions européennes|parlement européen|commission européenne|directives? européennes?|règlement européen)\b/g,
    minHits: 2,
  },
  {
    id: "libre-echange",
    label: "Accords de libre-échange",
    axe: "Favorable : ouvrir davantage les échanges commerciaux (accords de libre-échange, Mercosur, CETA). Défavorable : les limiter ou les refuser.",
    include: /\b(mercosur|ceta|libre[- ]échange|accords? commerciaux?|clauses? miroirs?|droits de douane)\b/g,
    minHits: 1,
  },
  {
    id: "regulation-numerique",
    label: "Régulation des plateformes et du numérique",
    axe: "Favorable : réguler davantage les plateformes et protéger les usagers (réseaux sociaux, mineurs, données, algorithmes). Défavorable : alléger ces obligations.",
    include: /\b(réseaux sociaux|plateformes? (numériques?|en ligne)|données personnelles|majorité numérique|algorithmes?|intelligence artificielle|contrôle parental|pédopornographie|dsa|cyberharcèlement)\b/g,
    minHits: 2,
  },
  {
    id: "culture-sport",
    label: "Financement public de la culture et du sport",
    axe: "Favorable : augmenter ou protéger le financement public de la culture, de l'audiovisuel public et du sport. Défavorable : le réduire ou privatiser.",
    include: /\b(culture|culturel(le)?s?|spectacle vivant|audiovisuel public|france télévisions|radio france|redevance|pass culture|bibliothèques?|musées?|sport|sportif(ve)?s?|clubs? sportifs?|jeux olympiques)\b/g,
    minHits: 2,
  },
  {
    id: "outre-mer",
    label: "Moyens et droits spécifiques outre-mer",
    axe: "Favorable : renforcer les moyens, la continuité territoriale et les droits spécifiques des outre-mer. Défavorable : les réduire ou aligner vers le droit commun défavorable.",
    include: /\b(outre-mer|ultramarins?|vie chère|continuité territoriale|nouvelle-calédonie|guadeloupe|martinique|la réunion|guyane|polynésie|mayotte)\b/g,
    exclude: /\b(immigration|titres? de séjour|droit du sol|regroupement familial|nationalité française|étrangers?)\b/,
    minHits: 2,
  },
  {
    id: "droits-femmes-egalite",
    label: "Droits des femmes et lutte contre les discriminations",
    axe: "Favorable : renforcer la protection contre les violences sexistes et sexuelles, l'égalité femmes-hommes et la lutte contre les discriminations. Défavorable : les alléger ou les restreindre.",
    include: /\b(violences? (sexistes?|sexuelles?|conjugales?|faites aux femmes)|féminicides?|égalité (professionnelle|femmes-hommes|salariale)|discriminations?|parité|congé paternité|harcèlement sexuel|consentement|racisme|antisémitisme|homophobie|lgbt)\b/g,
    minHits: 1,
  },
  {
    id: "ivg-pma",
    label: "IVG, PMA et bioéthique",
    axe: "Favorable : étendre l'accès à l'IVG, à la PMA et aux droits de la bioéthique. Défavorable : le restreindre.",
    include: /\b(ivg|interruption volontaire de grossesse|avortement|pma|procréation médicalement assistée|bioéthique|gpa|gestation pour autrui|don de gamètes|clause de conscience)\b/g,
    minHits: 1,
  },
  {
    id: "transports-ferroviaire",
    label: "Transports collectifs et ferroviaires",
    axe: "Favorable : favoriser le train et les transports collectifs (lignes, financement, petites lignes, vélo). Défavorable : favoriser la route, l'avion ou réduire ces moyens.",
    include: /\b(ferroviaire|sncf|petites lignes?|transports? (collectifs?|en commun)|lignes? de (train|bus|métro)|tgv|concessions? autoroutières?|péages?|aéroports?|trafic aérien|vols? intérieurs?|ferroutage|fret ferroviaire|mobilités? douces?|pistes? cyclables?)\b/g,
    minHits: 2,
  },
  {
    id: "revenus-agricoles",
    label: "Revenus agricoles et protection des prix",
    axe: "Favorable : protéger les revenus des agriculteurs (prix planchers, Egalim, encadrement des marges de la grande distribution). Défavorable : les assouplir.",
    include: /\b(egalim|prix planchers?|prix rémunérateurs?|revenus? agricoles?|marges?|grande distribution|centrales d[’']achat|négociations? commerciales?|clauses? de renégociation)\b/g,
    minHits: 2,
  },
  {
    id: "depense-publique",
    label: "Réduction de la dépense publique",
    axe: "Favorable : réduire la dépense publique ou le déficit (économies, gel, annulations de crédits, suppression d'organismes). Défavorable : augmenter les dépenses ou maintenir les crédits.",
    include: /\b(économies|réduction des dépenses|dépenses publiques?|annulations? de crédits?|gel des (crédits|dépenses)|déficit public|dette publique|suppression de (l[’']agence|l[’']office|la commission)|trajectoire (des finances publiques|budgétaire))\b/g,
    minHits: 2,
  },
];
