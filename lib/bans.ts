import { getTeam } from "./cblol";
import { championIconUrl, resolveChampion } from "./ddragon";
import { getPlayerStats } from "./opgg";
import { getSeasonPool } from "./opgg-site";
import { TIER_LIST, TIER_ORDER } from "./tierlist";
import { getTeamTrainings } from "./trainings";
import type {
  BanCandidate,
  BanChampion,
  BanRecommendation,
  BanThreat,
  BanTier,
  BanUsage,
  ChampionRef,
  TeamBans,
} from "./types";

// ---------------------------------------------------------------------------
// Pontuação dos bans
//
// nota = 100 × (0,7 × domínio + 0,3 × tier list)
//
// domínio (0–1) = o melhor jogador do time no campeão, mais um bônus pequeno
// quando outros jogadores também o dominam (o time tem opção de troca):
//   volume    = min(jogos / 40, 1)                       jogos = temporada + treinos
//   winrate   = (vitórias + 5) / (jogos + 10)            suavizado, evita 3 jogos = 100%
//   qualidade = (winrate − 45%) / 15%, limitado a 0–1    ≤45% → 0, ≥60% → 1
//   domínio do jogador = volume × (0,4 + 0,6 × qualidade)
// ---------------------------------------------------------------------------

const PRIMARY_COUNT = 5;
const SECONDARY_COUNT = 10;
/** Menos jogos que isso no total do time e o campeão nem entra na disputa. */
const MIN_TEAM_GAMES = 3;

const MASTERY_WEIGHT = 0.7;
const TIER_WEIGHT = 0.3;
const TIER_VALUE: Record<BanTier, number> = { S: 1, A: 0.66, B: 0.33 };

const FULL_VOLUME_GAMES = 40;
const PRIOR_GAMES = 10;
const WINRATE_FLOOR = 0.45;
const WINRATE_SPAN = 0.15;
const DEPTH_BONUS = 0.15;
const DEPTH_MIN_GAMES = 5;

const HIGH_THREAT = 70;
const MEDIUM_THREAT = 50;

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const gamesOf = (u: BanUsage) => u.seasonGames + u.trainingGames;
const winsOf = (u: BanUsage) => u.seasonWins + u.trainingWins;
const volume = (c: BanChampion) => c.usage.reduce((s, u) => s + gamesOf(u), 0);

function winrateOf(u: BanUsage): number {
  return (winsOf(u) + PRIOR_GAMES / 2) / (gamesOf(u) + PRIOR_GAMES);
}

function mastery(u: BanUsage): number {
  const vol = clamp01(gamesOf(u) / FULL_VOLUME_GAMES);
  const quality = clamp01((winrateOf(u) - WINRATE_FLOOR) / WINRATE_SPAN);
  return vol * (0.4 + 0.6 * quality);
}

function threatOf(score: number): BanThreat {
  return score >= HIGH_THREAT ? "alta" : score >= MEDIUM_THREAT ? "media" : "baixa";
}

function recommend(champion: BanChampion, tier: BanTier | null): BanRecommendation | null {
  if (volume(champion) < MIN_TEAM_GAMES) return null;

  const ranked = champion.usage
    .map((u) => ({ u, m: mastery(u) }))
    .sort((a, b) => b.m - a.m || gamesOf(b.u) - gamesOf(a.u));

  const best = ranked[0]?.m ?? 0;
  const depth = Math.min(ranked.filter((r) => gamesOf(r.u) >= DEPTH_MIN_GAMES).length, 3) / 3;
  const domain = clamp01(best + DEPTH_BONUS * depth);
  const score = 100 * (MASTERY_WEIGHT * domain + TIER_WEIGHT * (tier ? TIER_VALUE[tier] : 0));

  return {
    id: champion.id,
    name: champion.name,
    iconUrl: champion.iconUrl,
    score: Math.round(score),
    threat: threatOf(score),
    tier,
    players: ranked.slice(0, 3).map(({ u }) => ({
      ...u,
      games: gamesOf(u),
      winrate: winrateOf(u),
    })),
  };
}

// ---------------------------------------------------------------------------

interface SeasonChampion extends ChampionRef {
  games: number;
  wins: number;
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
          wins: c.wins,
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
      wins: c.wins,
    }));
  }
}

/**
 * Bans sugeridos contra um time: ranking único que mistura a tier list dos
 * campeões mais roubados com o que cada jogador joga bem (temporada ranqueada
 * inteira + treinos). Devolve os 5 mais prioritários e os 10 seguintes.
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
      u = { player, seasonGames: 0, seasonWins: 0, trainingGames: 0, trainingWins: 0 };
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
      const u = entry(c.id, player.name);
      u.seasonGames += c.games;
      u.seasonWins += c.wins;
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
    const players = [...(usage.get(id)?.values() ?? [])].sort(
      (a, b) => gamesOf(b) - gamesOf(a),
    );
    return {
      ...meta.get(id)!,
      usage: players,
      seasonGames: players.reduce((s, p) => s + p.seasonGames, 0),
      trainingGames: players.reduce((s, p) => s + p.trainingGames, 0),
      trainingWins: players.reduce((s, p) => s + p.trainingWins, 0),
    };
  };

  // Tier list: resolve os nomes e garante metadados mesmo sem uso no time.
  const tierById = new Map<string, BanTier>();
  const tiers = await Promise.all(
    TIER_ORDER.map(async (tier) => {
      const champions = await Promise.all(
        TIER_LIST[tier].map(async (name): Promise<BanCandidate> => {
          const c = await resolveChampion(name);
          tierById.set(c.id, tier);
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

  const ranking = [...usage.keys()]
    .map((id) => recommend(toChampion(id), tierById.get(id) ?? null))
    .filter((r): r is BanRecommendation => r !== null)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.players.reduce((s, p) => s + p.games, 0) - a.players.reduce((s, p) => s + p.games, 0),
    );

  return {
    team: data.team,
    primary: ranking.slice(0, PRIMARY_COUNT),
    secondary: ranking.slice(PRIMARY_COUNT, PRIMARY_COUNT + SECONDARY_COUNT),
    tiers,
    unavailable,
  };
}
