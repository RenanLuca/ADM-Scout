import { cacheLife } from "next/cache";
import { championIconUrl, resolveChampion } from "./ddragon";
import { splitRiotId } from "./riot-ids";
import { formatElo, topChampions, type MatchSample } from "./stats";
import type { ChampionStat, PlayerStats, StatsMode } from "./types";

// Servidor MCP público do OP.GG (Streamable HTTP, sem chave nem sessão).
const MCP_URL = "https://mcp-api.op.gg/mcp";
const REGION = "br";
const RECENT_LIMIT = 20; // máximo aceito pela ferramenta do OP.GG

export class OpggError extends Error {
  constructor(
    public readonly code: "not_found" | "unavailable",
    message: string,
  ) {
    super(message);
    this.name = "OpggError";
  }
}

/** Status "not_found" a partir de um erro (a classe se perde ao cruzar o 'use cache', a mensagem não). */
export function isNotFound(err: unknown): boolean {
  return err instanceof Error && /Summoner not found|not_found/i.test(err.message);
}

// ---------------------------------------------------------------------------
// Chamada MCP
// ---------------------------------------------------------------------------

// Educação com o serviço público: no máximo N chamadas em voo.
const MAX_IN_FLIGHT = 6;
let inFlight = 0;
const waiting: (() => void)[] = [];

async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (inFlight >= MAX_IN_FLIGHT) {
    await new Promise<void>((resolve) => waiting.push(resolve));
  }
  inFlight++;
  try {
    return await fn();
  } finally {
    inFlight--;
    waiting.shift()?.();
  }
}

async function callTool(name: string, args: Record<string, unknown>): Promise<Json> {
  const res = await withSlot(() =>
    fetch(MCP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name, arguments: args },
      }),
      cache: "no-store",
    }),
  );
  if (!res.ok) throw new OpggError("unavailable", `OP.GG MCP respondeu ${res.status}`);

  const body = (await res.json()) as {
    error?: { message: string };
    result?: { content?: { type: string; text: string }[]; isError?: boolean };
  };
  if (body.error) {
    const notFound = /not found/i.test(body.error.message);
    throw new OpggError(
      notFound ? "not_found" : "unavailable",
      notFound ? "Summoner not found" : `OP.GG MCP: ${body.error.message}`,
    );
  }
  const text = body.result?.content?.find((c) => c.type === "text")?.text;
  if (!text) throw new OpggError("unavailable", "OP.GG MCP respondeu sem conteúdo");
  return parseMcpText(text);
}

// ---------------------------------------------------------------------------
// Parser do formato de saída do OP.GG
//
//   class Summoner: league_stats,most_champions
//   class ChampionStat: play,win,lose,kill,death,assist,champion_name
//
//   LolGetSummonerProfile(Data(Summoner([LeagueStat(...)],MostChampions("RANKED",33,[ChampionStat(89,51,...,"Renekton")]))))
//
// Cada `class X: a,b,c` dá a ordem dos campos; cada construtor `X(v1,v2,v3)`
// vira um objeto { a: v1, b: v2, c: v3 }.
// ---------------------------------------------------------------------------

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };
type Obj = { [k: string]: Json };

export function parseMcpText(text: string): Json {
  const classes = new Map<string, string[]>();
  const lines = text.split("\n");
  let exprStart = 0;

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^class (\w+):\s*(.*)$/);
    if (!m) {
      if (lines[i].trim() === "") continue;
      exprStart = i;
      break;
    }
    classes.set(m[1], m[2].split(",").map((f) => f.trim()).filter(Boolean));
  }

  const src = lines.slice(exprStart).join("\n");
  let pos = 0;

  const ws = () => {
    while (pos < src.length && /\s/.test(src[pos])) pos++;
  };

  function value(): Json {
    ws();
    const c = src[pos];

    if (c === '"') {
      const start = pos++;
      while (pos < src.length && src[pos] !== '"') pos += src[pos] === "\\" ? 2 : 1;
      pos++;
      return JSON.parse(src.slice(start, pos)) as string;
    }
    if (c === "[") {
      pos++;
      const items: Json[] = [];
      ws();
      while (src[pos] !== "]") {
        items.push(value());
        ws();
        if (src[pos] === ",") pos++;
        ws();
      }
      pos++;
      return items;
    }

    const m = /^[A-Za-z0-9_.+-]+/.exec(src.slice(pos));
    if (!m) throw new Error(`Formato inesperado do OP.GG na posição ${pos}`);
    const word = m[0];
    pos += word.length;

    if (src[pos] === "(") {
      pos++;
      const args: Json[] = [];
      ws();
      while (src[pos] !== ")") {
        args.push(value());
        ws();
        if (src[pos] === ",") pos++;
        ws();
      }
      pos++;
      const fields = classes.get(word);
      if (!fields) return args;
      const obj: Obj = {};
      fields.forEach((f, idx) => (obj[f] = args[idx] ?? null));
      return obj;
    }

    if (word === "null") return null;
    if (word === "true") return true;
    if (word === "false") return false;
    const n = Number(word);
    return Number.isNaN(n) ? word : n;
  }

  return value();
}

// ---------------------------------------------------------------------------
// Estatísticas do jogador
// ---------------------------------------------------------------------------

const asArray = (v: Json | undefined): Obj[] => (Array.isArray(v) ? (v as Obj[]) : []);
const asObj = (v: Json | undefined): Obj | null =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : null;
const num = (v: Json | undefined): number => (typeof v === "number" ? v : 0);

async function fetchProfile(gameName: string, tagLine: string) {
  const data = asObj(
    await callTool("lol_get_summoner_profile", {
      game_name: gameName,
      tag_line: tagLine,
      region: REGION,
      desired_output_fields: [
        "data.summoner.league_stats[].{game_type,tier_info.{tier,division,lp}}",
        "data.summoner.most_champions.{game_type,season_id,play}",
        "data.summoner.most_champions.champion_stats[].{champion_name,play,win,lose,kill,death,assist}",
      ],
    }),
  );
  const summoner = asObj(asObj(data?.data)?.summoner);
  const most = asObj(summoner?.most_champions);

  const elo = formatElo(
    asArray(summoner?.league_stats).map((l) => {
      const t = asObj(l.tier_info);
      return {
        gameType: String(l.game_type ?? ""),
        tier: typeof t?.tier === "string" ? t.tier : null,
        division: typeof t?.division === "number" ? t.division : null,
        lp: typeof t?.lp === "number" ? t.lp : null,
      };
    }),
  );
  return { elo, most };
}

async function fetchRecentSamples(gameName: string, tagLine: string): Promise<MatchSample[]> {
  const data = asObj(
    await callTool("lol_list_summoner_matches", {
      game_name: gameName,
      tag_line: tagLine,
      region: REGION,
      limit: RECENT_LIMIT,
      desired_output_fields: [
        "data.game_history[].participants[].champion_name",
        "data.game_history[].participants[].stats.{kill,death,assist,result}",
      ],
    }),
  );

  const samples: MatchSample[] = [];
  for (const game of asArray(asObj(data?.data)?.game_history)) {
    // A ferramenta devolve só o jogador-alvo em `participants`.
    const me = asArray(game.participants)[0];
    const stats = asObj(me?.stats);
    if (!me || !stats || typeof me.champion_name !== "string") continue;
    samples.push({
      championId: me.champion_name,
      kills: num(stats.kill),
      deaths: num(stats.death),
      assists: num(stats.assist),
      win: stats.result === "WIN",
    });
  }
  return samples;
}

async function loadStats(
  gameName: string,
  tagLine: string,
  mode: StatsMode,
): Promise<{ elo: string; games: number; rows: Omit<ChampionStat, "championName" | "iconUrl">[] }> {
  if (mode === "season") {
    const { elo, most } = await fetchProfile(gameName, tagLine);
    const rows = asArray(most?.champion_stats)
      .filter((c) => typeof c.champion_name === "string")
      .map((c) => {
        const games = num(c.play);
        const wins = num(c.win);
        return {
          championId: String(c.champion_name),
          games,
          wins,
          winrate: games ? wins / games : 0,
          kda: (num(c.kill) + num(c.assist)) / Math.max(num(c.death), 1),
        };
      })
      .sort((a, b) => b.games - a.games);
    return { elo, games: num(most?.play), rows };
  }

  const [{ elo }, samples] = await Promise.all([
    fetchProfile(gameName, tagLine),
    fetchRecentSamples(gameName, tagLine),
  ]);
  return { elo, games: samples.length, rows: topChampions(samples, Infinity) };
}

const TAG_STOPWORDS = /^(do|da|de|dos|das|in|of|the)$/i;

/** Tags de time prováveis, da mais para a menos provável ("AMIGOS DO MYLENNZY" → ADM, AM, AMI…). */
export function teamTagCandidates(teamName: string): string[] {
  const words = teamName.split(/\s+/).filter(Boolean);
  const significant = words.filter((w) => !TAG_STOPWORDS.test(w));
  const tags = new Set<string>();
  const add = (s: string) => {
    const t = s.toUpperCase();
    if (t.length >= 2 && t.length <= 5) tags.add(t);
  };

  add(words.map((w) => w[0]).join(""));
  add(significant.map((w) => w[0]).join(""));
  for (const w of significant) {
    add(w.slice(0, 3));
    add(w.slice(0, 2));
  }
  add(teamName.replace(/\s+/g, "").slice(0, 3));
  return [...tags];
}

async function accountExists(gameName: string, tagLine: string): Promise<boolean> {
  try {
    await callTool("lol_get_summoner_profile", {
      game_name: gameName,
      tag_line: tagLine,
      region: REGION,
      desired_output_fields: ["data.summoner.most_champions.play"],
    });
    return true;
  } catch (err) {
    if (isNotFound(err)) return false;
    throw err; // indisponibilidade não pode virar "não achou" em cache
  }
}

/**
 * Procura o nome atual de uma conta renomeada, mantendo a #TAG: remove um
 * prefixo antigo ("T1L Nick" → "Nick") ou testa "TAG Nick" / "TAGNick" com as
 * tags prováveis do time. Cacheia inclusive o "não achei" (15 min) para não repetir
 * dezenas de chamadas a cada acesso.
 */
async function findRenamedName(
  gameName: string,
  tagLine: string,
  teamName: string,
): Promise<string | null> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 900, expire: 3600 });

  const candidates: string[] = [];
  const firstSpace = gameName.indexOf(" ");
  if (firstSpace > 0) candidates.push(gameName.slice(firstSpace + 1)); // tirou/alterou a tag
  for (const tag of teamTagCandidates(teamName)) {
    candidates.push(`${tag} ${gameName}`, `${tag}${gameName}`);
  }

  const unique = [...new Set(candidates)].filter((c) => c !== gameName);
  const found = await Promise.all(unique.map((c) => accountExists(c, tagLine)));
  const i = found.findIndex(Boolean);
  return i === -1 ? null : unique[i];
}

/**
 * Elo + campeões do jogador, da temporada ranqueada ("season") ou das
 * últimas 20 partidas ("recent"). Cache de 30 min por Riot ID e modo; erros
 * lançam e não ficam no cache.
 */
export async function getPlayerStats(
  riotId: string,
  mode: StatsMode,
  teamName?: string,
): Promise<PlayerStats> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 1800, expire: 3600 });

  const { gameName, tagLine } = splitRiotId(riotId);
  // O Riot ID vem do link do OP.GG, onde espaço e hífen se confundem.
  const names = gameName.includes(" ") ? [gameName, gameName.replace(/ /g, "-")] : [gameName];

  let result: Awaited<ReturnType<typeof loadStats>> | null = null;
  let resolvedId = riotId;
  for (const name of names) {
    try {
      result = await loadStats(name, tagLine, mode);
      break;
    } catch (err) {
      if (!isNotFound(err)) throw err;
    }
  }

  // Nick trocado (ex.: colocou a tag do time na frente): o #TAG costuma ficar igual.
  if (!result && teamName) {
    const renamed = await findRenamedName(gameName, tagLine, teamName);
    if (renamed) {
      result = await loadStats(renamed, tagLine, mode);
      resolvedId = `${renamed}#${tagLine}`;
    }
  }
  if (!result) throw new OpggError("not_found", "Summoner not found");

  const resolved = await Promise.all(result.rows.map((r) => resolveChampion(r.championId)));
  return {
    riotId: resolvedId,
    mode,
    elo: result.elo,
    games: result.games,
    champions: result.rows.map((r, i) => ({
      ...r,
      championId: resolved[i].id,
      championName: resolved[i].name,
      iconUrl: championIconUrl(resolved[i].version, resolved[i].id),
    })),
  };
}
