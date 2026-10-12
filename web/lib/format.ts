export const fmt = new Intl.NumberFormat("fr-FR");
export const pct = (n: number | null | undefined) => (n == null ? "—" : n.toFixed(1).replace(".", ",") + " %");
export const NEUTRAL = "#8d949a";
export const POLITICAL_ORDER = ["LFI-NFP", "GDR", "ECOS", "SOC", "EPR", "DEM", "HOR", "LIOT", "DR", "UDR", "UDDPLR", "RN", "NI"];
export const politicalRank = (sigle: string) => { const i = POLITICAL_ORDER.indexOf(sigle); return i < 0 ? 99 : i; };
