import { cacheLife } from "next/cache";
import { getChampionLanes } from "./champion-lanes";
import type { Role } from "./types";

const BASE = "https://ddragon.leagueoflegends.com";

interface DdragonMeta {
  version: string;
  /** nome em inglês normalizado ("kaisa") → id do ddragon ("Kaisa") */
  idByName: Record<string, string>;
  /** id do ddragon → nome exibido em pt-BR */
  nameById: Record<string, string>;
}

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

async function getDdragon(): Promise<DdragonMeta> {
  "use cache";
  cacheLife("days");

  const versions: string[] = await (await fetch(`${BASE}/api/versions.json`)).json();
  const version = versions[0];
  const [en, pt] = await Promise.all(
    ["en_US", "pt_BR"].map(async (lang) =>
      (await fetch(`${BASE}/cdn/${version}/data/${lang}/champion.json`)).json(),
    ),
  );

  const idByName: Record<string, string> = {};
  const nameById: Record<string, string> = {};
  for (const c of Object.values<{ id: string; name: string }>(en.data)) {
    idByName[normalize(c.name)] = c.id;
    idByName[normalize(c.id)] = c.id;
  }
  for (const c of Object.values<{ id: string; name: string }>(pt.data)) {
    nameById[c.id] = c.name;
  }
  return { version, idByName, nameById };
}

/** "Jarvan IV" / "Kai'Sa" (nome do OP.GG, em inglês) → id, nome pt-BR e versão do ddragon. */
export async function resolveChampion(
  opggName: string,
): Promise<{ id: string; name: string; version: string }> {
  const { version, idByName, nameById } = await getDdragon();
  const key = normalize(opggName);

  let id = idByName[key];
  if (!id && key.length >= 3) {
    // Nomes abreviados do cblow.xyz ("Miss", "Yori"): vale se só um campeão começa assim.
    const matches = new Set(
      Object.keys(idByName)
        .filter((k) => k.startsWith(key))
        .map((k) => idByName[k]),
    );
    if (matches.size === 1) id = [...matches][0];
  }
  id ??= opggName.replace(/[^A-Za-z0-9]/g, "");

  return { id, name: nameById[id] ?? opggName, version };
}

export function championIconUrl(version: string, championId: string): string {
  return `${BASE}/cdn/${version}/img/champion/${championId}.png`;
}

/**
 * Todos os campeões (id do Data Dragon, nome em pt-BR, ícone e rotas), em ordem
 * alfabética. Se a fonte de rotas estiver fora do ar, `lanes` vem vazio e a tela
 * simplesmente não oferece o filtro por rota.
 */
export async function listChampions(): Promise<
  { id: string; name: string; iconUrl: string; lanes: Role[] }[]
> {
  const [{ version, nameById }, lanesById] = await Promise.all([
    getDdragon(),
    getChampionLanes().catch(() => ({}) as Record<string, Role[]>),
  ]);
  return Object.entries(nameById)
    .map(([id, name]) => ({
      id,
      name,
      iconUrl: championIconUrl(version, id),
      lanes: lanesById[id] ?? [],
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}
