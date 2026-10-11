import type { ChampionStat } from "./types";

export interface MatchSample {
  /** nome do campeão como vem do OP.GG ("Jarvan IV") */
  championId: string;
  kills: number;
  deaths: number;
  assists: number;
  win: boolean;
}

export interface LeagueTier {
  /** SOLORANKED, FLEXRANKED, ARENA… */
  gameType: string;
  tier: string | null;
  division: number | null;
  lp: number | null;
}

const TIERS: Record<string, string> = {
  IRON: "Ferro",
  BRONZE: "Bronze",
  SILVER: "Prata",
  GOLD: "Ouro",
  PLATINUM: "Platina",
  EMERALD: "Esmeralda",
  DIAMOND: "Diamante",
  MASTER: "Mestre",
  GRANDMASTER: "Grão-Mestre",
  CHALLENGER: "Desafiante",
};

const APEX = new Set(["MASTER", "GRANDMASTER", "CHALLENGER"]);
const ROMAN = ["", "I", "II", "III", "IV"];

/** Elo da solo/duo; se não houver, da flex; senão "Sem ranking". */
export function formatElo(entries: LeagueTier[]): string {
  const entry = ["SOLORANKED", "FLEXRANKED"]
    .map((q) => entries.find((e) => e.gameType === q && e.tier))
    .find(Boolean);
  if (!entry?.tier) return "Sem ranking";

  const tier = TIERS[entry.tier] ?? entry.tier;
  const division =
    APEX.has(entry.tier) || !entry.division ? "" : ` ${ROMAN[entry.division] ?? entry.division}`;
  return `${tier}${division} · ${entry.lp ?? 0} PDL`;
}

/** Agrupa por campeão (jogos, vitórias, KDA) e devolve os `limit` mais jogados. */
export function topChampions(
  samples: MatchSample[],
  limit = 5,
): Omit<ChampionStat, "championName" | "iconUrl">[] {
  const byChamp = new Map<
    string,
    { games: number; wins: number; k: number; d: number; a: number }
  >();

  for (const s of samples) {
    const acc = byChamp.get(s.championId) ?? { games: 0, wins: 0, k: 0, d: 0, a: 0 };
    acc.games += 1;
    acc.wins += s.win ? 1 : 0;
    acc.k += s.kills;
    acc.d += s.deaths;
    acc.a += s.assists;
    byChamp.set(s.championId, acc);
  }

  return [...byChamp.entries()]
    .map(([championId, c]) => ({
      championId,
      games: c.games,
      wins: c.wins,
      winrate: c.wins / c.games,
      kda: (c.k + c.a) / Math.max(c.d, 1),
    }))
    .sort((x, y) => y.games - x.games || y.winrate - x.winrate)
    .slice(0, limit);
}
