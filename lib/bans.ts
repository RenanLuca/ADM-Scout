import { getTeam } from "./cblol";
import { championIconUrl, resolveChampion } from "./ddragon";
import { getPlayerStats } from "./opgg";
import { TIER_LIST, TIER_ORDER } from "./tierlist";
import { getTeamTrainings } from "./trainings";
import type { BanCandidate, BanChampion, BanUsage, ChampionRef, TeamBans } from "./types";

// Critérios dos bans que não vêm da tier list.
const TRAINING_MIN_GAMES = 2;
const TRAINING_MIN_WINRATE = 0.6;
const SOLOQ_MIN_PLAYER_GAMES = 20;
const EXTRA_LIMIT = 10;

const total = (u: BanUsage) => u.seasonGames + u.trainingGames;

/**
 * Possíveis bans contra um time:
 *  1. campeões da tier list dos mais roubados do campeonato (S, A, B);
 *  2. campeões que o time vence bastante nos treinos;
 *  3. campeões com muitos jogos na soloq (temporada ranqueada).
 * Os grupos 2 e 3 não repetem campeões que já estão na tier list.
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

  // Temporada ranqueada (OP.GG)
  const unavailable: string[] = [];
  seasons.forEach((r, i) => {
    const player = data.players[i];
    if (r.status === "rejected" || !r.value.stats) {
      unavailable.push(player.name);
      return;
    }
    for (const c of r.value.stats.champions) {
      meta.set(c.championId, { id: c.championId, name: c.championName, iconUrl: c.iconUrl });
      entry(c.championId, player.name).seasonGames += c.games;
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
      champions.sort(
        (a, b) => b.seasonGames + b.trainingGames - (a.seasonGames + a.trainingGames),
      );
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
    .sort((a, b) => b.seasonGames - a.seasonGames)
    .slice(0, EXTRA_LIMIT);

  return { team: data.team, tiers, trainingStandouts, soloqMostPlayed, unavailable };
}
