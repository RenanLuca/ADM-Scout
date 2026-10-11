import { getTeam } from "./cblol";
import { championIconUrl, resolveChampion } from "./ddragon";
import { getPlayerStats } from "./opgg";
import { getSeasonPool } from "./opgg-site";
import { TIER_LIST, TIER_ORDER } from "./tierlist";
import { getTeamTrainings } from "./trainings";
import type { BanCandidate, BanChampion, BanUsage, ChampionRef, TeamBans } from "./types";

// Critérios dos bans que não vêm da tier list.
const TRAINING_MIN_GAMES = 2;
const TRAINING_MIN_WINRATE = 0.6;
const SOLOQ_MIN_PLAYER_GAMES = 20;
const EXTRA_LIMIT = 10;

const total = (u: BanUsage) => u.seasonGames + u.trainingGames;
const volume = (c: BanChampion) => c.usage.reduce((s, u) => s + total(u), 0);

interface SeasonChampion extends ChampionRef {
  games: number;
}

/**
 * Campeões da temporada ranqueada de um jogador. O MCP resolve nicks trocados e
 * dá o top 10; a lista completa vem do site do OP.GG. Se o site falhar, ficamos
 * com o top 10 do MCP.
 */
async function loadSeason(
  riotId: string | null,
  teamName: string,
): Promise<SeasonChampion[] | null> {
  if (!riotId) return null;

  const stats = await getPlayerStats(riotId, "season", teamName);
  try {
    const pool = await getSeasonPool(stats.riotId);
    return await Promise.all(
      pool.champions.map(async (c) => {
        const r = await resolveChampion(c.name);
        return {
          id: r.id,
          name: r.name,
          iconUrl: championIconUrl(r.version, r.id),
          games: c.games,
        };
      }),
    );
  } catch (err) {
    console.error(`[bans] lista completa indisponível para ${stats.riotId}:`, err);
    return stats.champions.map((c) => ({
      id: c.championId,
      name: c.championName,
      iconUrl: c.iconUrl,
      games: c.games,
    }));
  }
}

/**
 * Possíveis bans contra um time:
 *  1. campeões da tier list dos mais roubados do campeonato (S, A, B);
 *  2. campeões que o time vence bastante nos treinos;
 *  3. campeões com muitos jogos na soloq (temporada ranqueada inteira).
 * Os grupos 2 e 3 não repetem campeões que já estão na tier list.
 */
export async function getTeamBans(slug: string): Promise<TeamBans | null> {
  const data = await getTeam(slug);
  if (!data) return null;

  const [trainings, seasons] = await Promise.all([
    getTeamTrainings(slug),
    Promise.allSettled(data.players.map((p) => loadSeason(p.riotId, data.team.name))),
  ]);

  const meta = new Map<string, ChampionRef>();
  // championId (ddragon) → jogador → uso
  const usage = new Map<string, Map<string, BanUsage>>();
  const entry = (championId: string, player: string): BanUsage => {
    const byPlayer = usage.get(championId) ?? new Map<string, BanUsage>();
    let u = byPlayer.get(player);
    if (!u) {
      u = { player, seasonGames: 0, trainingGames: 0, trainingWins: 0 };
      byPlayer.set(player, u);
    }
    usage.set(championId, byPlayer);
    return u;
  };

  // Temporada ranqueada inteira (OP.GG)
  const unavailable: string[] = [];
  data.players.forEach((player, i) => {
    const season = seasons[i];
    if (season.status === "rejected" || !season.value) {
      unavailable.push(player.name);
      return;
    }
    for (const c of season.value) {
      meta.set(c.id, { id: c.id, name: c.name, iconUrl: c.iconUrl });
      entry(c.id, player.name).seasonGames += c.games;
    }
  });

  // Treinos: o cblow.xyz só dá o placar da série. Cada jogo do time vale
  // (vitórias da série ÷ jogos da série): exato em 3-0/2-0, proporcional em 2-1.
  for (const t of trainings?.trainings ?? []) {
    const mine = t.team1.slug === slug ? t.team1 : t.team2;
    if (t.games.length === 0) continue;
    const winShare = mine.score / t.games.length;

    for (const g of t.games) {
      for (const p of g.picks) {
        if (p.teamSlug !== slug) continue;
        meta.set(p.champion.id, p.champion);
        const u = entry(p.champion.id, p.nick);
        u.trainingGames += 1;
        u.trainingWins += winShare;
      }
    }
  }

  const toChampion = (id: string): BanChampion => {
    const players = [...(usage.get(id)?.values() ?? [])].sort((a, b) => total(b) - total(a));
    const ref = meta.get(id)!;
    return {
      ...ref,
      usage: players,
      seasonGames: players.reduce((s, p) => s + p.seasonGames, 0),
      trainingGames: players.reduce((s, p) => s + p.trainingGames, 0),
      trainingWins: players.reduce((s, p) => s + p.trainingWins, 0),
    };
  };

  // 1. Tier list
  const tierIds = new Set<string>();
  const tiers = await Promise.all(
    TIER_ORDER.map(async (tier) => {
      const champions = await Promise.all(
        TIER_LIST[tier].map(async (name): Promise<BanCandidate> => {
          const c = await resolveChampion(name);
          tierIds.add(c.id);
          if (!meta.has(c.id)) {
            meta.set(c.id, { id: c.id, name: c.name, iconUrl: championIconUrl(c.version, c.id) });
          }
          return { ...toChampion(c.id), tier };
        }),
      );
      champions.sort((a, b) => volume(b) - volume(a));
      return { tier, champions };
    }),
  );

  const outsideTierList = [...usage.keys()].filter((id) => !tierIds.has(id)).map(toChampion);

  // 2. Vencem bastante nos treinos
  const trainingStandouts = outsideTierList
    .filter(
      (c) =>
        c.trainingGames >= TRAINING_MIN_GAMES &&
        c.trainingWins / c.trainingGames >= TRAINING_MIN_WINRATE,
    )
    .sort((a, b) => b.trainingWins - a.trainingWins || b.trainingGames - a.trainingGames)
    .slice(0, EXTRA_LIMIT);

  // 3. Muitos jogos na soloq (algum jogador com volume relevante nele)
  const soloqMostPlayed = outsideTierList
    .filter((c) => c.usage.some((u) => u.seasonGames >= SOLOQ_MIN_PLAYER_GAMES))
    .sort((a, b) => volume(b) - volume(a))
    .slice(0, EXTRA_LIMIT);

  return { team: data.team, tiers, trainingStandouts, soloqMostPlayed, unavailable };
}
