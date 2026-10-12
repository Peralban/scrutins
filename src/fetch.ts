import { existsSync, mkdirSync, rmSync } from "node:fs";

const BASE = "https://data.assemblee-nationale.fr/static/openData/repository/17";
const SOURCES = {
  scrutins: `${BASE}/loi/scrutins/Scrutins.json.zip`,
  amo10: `${BASE}/amo/deputes_actifs_mandats_actifs_organes/AMO10_deputes_actifs_mandats_actifs_organes.json.zip`,
  amo50: `${BASE}/amo/acteurs_mandats_organes_divises/AMO50_acteurs_mandats_organes_divises.json.zip`,
};

export const RAW = new URL("../data/raw/", import.meta.url).pathname;

export async function fetchAll() {
  mkdirSync(RAW, { recursive: true });
  for (const [name, url] of Object.entries(SOURCES)) {
    const zip = `${RAW}${name}.zip`;
    const dir = `${RAW}${name}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    await Bun.write(zip, res);
    rmSync(dir, { recursive: true, force: true });
    const unzip = Bun.spawnSync(["unzip", "-q", "-o", zip, "-d", dir]);
    if (unzip.exitCode !== 0) throw new Error(`unzip ${name}: ${unzip.stderr}`);
    console.log(`${name}: ${(Bun.file(zip).size / 1e6).toFixed(1)} MB`);
  }
}

if (import.meta.main) await fetchAll();
