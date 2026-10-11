import { cacheLife } from "next/cache";
import { splitRiotId } from "./riot-ids";

/**
 * Lista COMPLETA de campeões da temporada ranqueada, lida da aba "Champions"
 * do site do OP.GG. O servidor MCP só devolve os 10 mais jogados; o site traz
 * todos (ex.: 34 campeões para quem jogou 229 partidas).
 *
 * Não é uma API oficial: lemos o payload RSC embutido na página, então o
 * formato pode mudar. Quem chama deve ter um plano B (o top 10 do MCP).
 */

const SITE = "https://op.gg/lol/summoners/br";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export interface SeasonChampion {
  /** Nome em inglês, como o OP.GG exibe (ex.: "Miss Fortune"). */
  name: string;
  games: number;
  wins: number;
}

export interface SeasonPool {
  games: number;
  champions: SeasonChampion[];
}

/** Junta os pedaços `self.__next_f.push([1,"..."])` do payload da página. */
function decodeFlight(html: string): string {
  let out = "";
  for (const m of html.matchAll(/self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g)) {
    try {
      out += JSON.parse(`"${m[1]}"`) as string;
    } catch {
      // chunk que não é string JSON: ignora
    }
  }
  return out;
}

/** Extrai o array JSON que começa depois de `key` (balanceando colchetes). */
function arrayAfter(text: string, key: string): unknown[] | null {
  const k = text.indexOf(key);
  if (k === -1) return null;
  const start = text.indexOf("[", k);
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === "[") depth++;
    else if (c === "]" && --depth === 0) {
      return JSON.parse(text.slice(start, i + 1)) as unknown[];
    }
  }
  return null;
}

export function parseSeasonPool(html: string): SeasonPool {
  const payload = decodeFlight(html);
  const raw = arrayAfter(payload, '"my_champion_stats":');
  if (!raw) throw new Error("OP.GG: lista de campeões não encontrada na página");

  const rows = raw as { id?: number; name?: string; play?: number; win?: number }[];
  // O item 0 é o total (id 0, name "1").
  const total = rows.find((r) => r.id === 0);
  const champions = rows
    .filter((r) => r.id !== 0 && typeof r.name === "string" && typeof r.play === "number")
    .map((r) => ({ name: r.name as string, games: r.play as number, wins: r.win ?? 0 }))
    .sort((a, b) => b.games - a.games);

  return { games: total?.play ?? champions.reduce((s, c) => s + c.games, 0), champions };
}

/**
 * Cache de 1h por Riot ID. Erros lançam (não ficam no cache). A página pesa
 * ~1 MB, por isso o cache é mais longo que o das estatísticas do MCP.
 */
export async function getSeasonPool(riotId: string): Promise<SeasonPool> {
  "use cache";
  cacheLife({ stale: 600, revalidate: 3600, expire: 7200 });

  const { gameName, tagLine } = splitRiotId(riotId);
  const url = `${SITE}/${encodeURIComponent(gameName)}-${encodeURIComponent(tagLine)}/champions`;

  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, cache: "no-store" });
  if (!res.ok) throw new Error(`OP.GG site respondeu ${res.status}`);
  return parseSeasonPool(await res.text());
}
