import { getTeam } from "./cblol";
import { championIconUrl, resolveChampion } from "./ddragon";
import { getPlayerStats } from "./opgg";
import { TIER_LIST, TIER_ORDER } from "./tierlist";
import { getTeamTrainings } from "./trainings";
import type { BanCandidate, BanUsage, TeamBans } from "./types";

/**
 * Possíveis bans contra um time: os campeões da tier list dos mais roubados do
 * campeonato, com quem do time os joga (temporada ranqueada no OP.GG + picks
 * nos treinos). Dentro de cada tier, os mais usados pelo time vêm primeiro.
 */
export async function getTeamBans(slug: string): Promise<TeamBans | null> {
  const data = await getTeam(slug);
  if (!data) return null;

  const [trainings, seasons] = await Promise.all([
    getTeamTrainings(slug),
    Promise.allSettled(
      data.players.map(async (p) => ({
        name: p.name,
        stats: p.riotId ? await getPlayerStats(p.riotId, "season") : null,
      })),
    ),
  ]);

  // championId (ddragon) → jogador → { temporada, treinos }
  const usage = new Map<string, Map<string, BanUsage>>();
  const bump = (championId: string, player: string, field: "seasonGames" | "trainingGames", n: number) => {
    const byPlayer = usage.get(championId) ?? new Map<string, BanUsage>();
    const u = byPlayer.get(player) ?? { player, seasonGames: 0, trainingGames: 0 };
    u[field] += n;
    byPlayer.set(player, u);
    usage.set(championId, byPlayer);
  };

  const unavailable: string[] = [];
  seasons.forEach((r, i) => {
    const player = data.players[i];
    if (r.status === "rejected") {
      unavailable.push(player.name);
      return;
    }
    // Sem Riot ID ou sem link no OP.GG: também fica de fora do histórico.
    if (!r.value.stats) {
      unavailable.push(player.name);
      return;
    }
    for (const c of r.value.stats.champions) bump(c.championId, player.name, "seasonGames", c.games);
  });

  for (const pool of trainings?.pools ?? []) {
    for (const c of pool.champions) bump(c.id, pool.nick, "trainingGames", c.games);
  }

  const tiers = await Promise.all(
    TIER_ORDER.map(async (tier) => {
      const champions = await Promise.all(
        TIER_LIST[tier].map(async (name): Promise<BanCandidate> => {
          const c = await resolveChampion(name);
          const players = [...(usage.get(c.id)?.values() ?? [])].sort(
            (a, b) =>
              b.seasonGames + b.trainingGames - (a.seasonGames + a.trainingGames),
          );
          return {
            id: c.id,
            name: c.name,
            iconUrl: championIconUrl(c.version, c.id),
            tier,
            usage: players,
            seasonGames: players.reduce((s, p) => s + p.seasonGames, 0),
            trainingGames: players.reduce((s, p) => s + p.trainingGames, 0),
          };
        }),
      );
      // Ordenação estável: empates mantêm a ordem da tier list.
      champions.sort(
        (a, b) => b.seasonGames + b.trainingGames - (a.seasonGames + a.trainingGames),
      );
      return { tier, champions };
    }),
  );

  return { team: data.team, tiers, unavailable };
}
