import { cacheLife } from "next/cache";

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
  const id = idByName[normalize(opggName)] ?? opggName.replace(/[^A-Za-z0-9]/g, "");
  return { id, name: nameById[id] ?? opggName, version };
}

export function championIconUrl(version: string, championId: string): string {
  return `${BASE}/cdn/${version}/img/champion/${championId}.png`;
}
