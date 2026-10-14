import { cacheLife } from "next/cache";
import { LANE_ORDER } from "./lanes";
import type { Role } from "./types";

/**
 * Rotas em que cada campeão costuma jogar, da Meraki Analytics (o Data Dragon só
 * tem classes como Lutador/Mago, não rotas). A chave do arquivo é o mesmo id do
 * Data Dragon (ex.: "MissFortune"). O arquivo é grande (~13 MB), então fica em
 * cache por dias e só o mapa id → rotas é guardado.
 */
const SOURCE =
  "https://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/champions.json";

const POSITION: Record<string, Role> = {
  TOP: "TOP",
  JUNGLE: "JUNGLE",
  MIDDLE: "MID",
  BOTTOM: "ADC",
  SUPPORT: "SUPPORT",
};

export async function getChampionLanes(): Promise<Record<string, Role[]>> {
  "use cache";
  cacheLife("days");

  const res = await fetch(SOURCE);
  if (!res.ok) throw new Error(`Meraki respondeu ${res.status}`);

  const raw = (await res.json()) as Record<string, { key?: string; positions?: string[] }>;
  const out: Record<string, Role[]> = {};
  for (const c of Object.values(raw)) {
    if (!c.key) continue;
    const lanes = new Set<Role>();
    for (const p of c.positions ?? []) {
      const lane = POSITION[p];
      if (lane) lanes.add(lane);
    }
    out[c.key] = LANE_ORDER.filter((l) => lanes.has(l));
  }
  return out;
}
