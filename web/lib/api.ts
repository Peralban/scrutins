import { cacheLife } from "next/cache";
import type { DeputeData, DeputeNotion, DeputeRow, GroupeStat, Mois, NotionDetail, NotionSummary, Overview, ThemesData } from "./types";

// Server-side access to the data API. The data only changes with the nightly refresh,
// so every getter is cached for hours. Callers run `await connection()` first so that
// nothing is fetched while the app builds (the API need not be up at build time).
const API = process.env.API_URL ?? "http://localhost:3001";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API}/api/${path}`);
  if (!res.ok) throw new Error(`API ${path}: HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export async function getOverview() { "use cache"; cacheLife("hours"); return get<Overview>("overview"); }
export async function getGroupes() { "use cache"; cacheLife("hours"); return get<GroupeStat[]>("groupes"); }
export async function getMensuel() { "use cache"; cacheLife("hours"); return get<Mois[]>("mensuel"); }
export async function getDeputes() { "use cache"; cacheLife("hours"); return get<DeputeRow[]>("deputes?min=0"); }
export async function getThemes(scope: "ensemble" | "tous") { "use cache"; cacheLife("hours"); return get<ThemesData>(`themes?scope=${scope}`); }
export async function getDepute(id: string): Promise<DeputeData | { error: string }> {
  "use cache";
  cacheLife("hours");
  const res = await fetch(`${API}/api/depute/${encodeURIComponent(id)}`);
  if (res.status === 404) return { error: "not found" };
  if (!res.ok) throw new Error(`API depute: HTTP ${res.status}`);
  return res.json();
}
export async function getNotions() { "use cache"; cacheLife("hours"); return get<NotionSummary[]>("notions"); }
export async function getNotion(id: string): Promise<NotionDetail | { error: string }> {
  "use cache";
  cacheLife("hours");
  const res = await fetch(`${API}/api/notions/${encodeURIComponent(id)}`);
  if (res.status === 404) return { error: "not found" };
  if (!res.ok) throw new Error(`API notion: HTTP ${res.status}`);
  return res.json();
}
export async function getDeputeNotions(id: string) { "use cache"; cacheLife("hours"); return get<DeputeNotion[]>(`depute/${encodeURIComponent(id)}/notions`); }
