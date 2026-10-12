export const fmt = new Intl.NumberFormat("fr-FR");
export const pct = (n: number | null | undefined) => (n == null ? "—" : n.toFixed(1).replace(".", ",") + " %");
export const NEUTRAL = "#8d949a";
export const POLITICAL_ORDER = ["LFI-NFP", "GDR", "ECOS", "SOC", "EPR", "DEM", "HOR", "LIOT", "DR", "UDR", "UDDPLR", "RN", "NI"];
export const politicalRank = (sigle: string) => { const i = POLITICAL_ORDER.indexOf(sigle); return i < 0 ? 99 : i; };

// Reading of a favourable / unfavourable count. Deliberately coarse, and silent when there are too few votes.
export const MIN_VOTES_VERDICT = 5;
export function verdict(favorables: number, defavorables: number): { label: string; tone: "pour" | "contre" | "neutre" | "vide"; part: number | null } {
  const n = favorables + defavorables;
  if (n < MIN_VOTES_VERDICT) return { label: "trop peu de votes", tone: "vide", part: n ? (100 * favorables) / n : null };
  const part = (100 * favorables) / n;
  if (part >= 67) return { label: "plutôt favorable", tone: "pour", part };
  if (part <= 33) return { label: "plutôt défavorable", tone: "contre", part };
  return { label: "partagé", tone: "neutre", part };
}
