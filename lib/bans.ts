import { getTeam } from "./cblol";
import { championIconUrl, resolveChampion } from "./ddragon";
import { getTeamChampionship } from "./championship";
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
// nota = 100 × (0,45 × domínio + 0,15 × one trick + 0,40 × tier list)
//                                                       tier: S = 40 pts, A = 26, B = 13
//
// domínio (0–1) = o melhor jogador do time no campeão, mais um bônus pequeno
// quando outros jogadores também o dominam (o time tem opção de troca):
//   volume   = √(min(jogos / 100, 1))   jogos = soloq + treinos + campeonato
//   WR       = só treinos e jogos oficiais (a soloq conta apenas a quantidade de jogos)
//   fator WR = 1 + 0,8 × (WR suavizado − 50%), limitado a 0,6–1,2
//              sem treino/campeonato no campeão, fator = 1 (não pune nem premia)
//   domínio do jogador = volume × fator WR
//
// one trick (0–1) = o jogador mais concentrado no campeão:
//   concentração = (fatia das partidas ranqueadas dele − 15%) / 45%, limitada a 0–1
//   volume       = min(jogos na soloq / 150, 1)
//   one trick    = concentração × volume          ex.: 1016 de 1100 jogos → 1,0
//
// One trick tem nota mínima, independente da tier: quem concentra as partidas num
// campeão é ameaça mesmo fora da tier list.
//   se one trick ≥ 0,25:  nota mínima = 55 + 40 × one trick     (1,0 → 95; 0,5 → 75)
// ---------------------------------------------------------------------------

const PRIMARY_COUNT = 5;
const SECONDARY_COUNT = 10;
/** Menos jogos que isso no total do time e o campeão nem entra na disputa. */
const MIN_TEAM_GAMES = 3;

const MASTERY_WEIGHT = 0.45;
const ONE_TRICK_WEIGHT = 0.15;
const TIER_WEIGHT = 0.4;
const TIER_VALUE: Record<BanTier, number> = { S: 1, A: 0.65, B: 0.33 };

/** Jogos no campeão que já valem 100% do volume. */
const FULL_VOLUME_GAMES = 100;
/** Jogos "fantasma" a 50% para suavizar o WR de amostras pequenas (treino/oficial). */
const PRIOR_GAMES = 5;
const WINRATE_SENSITIVITY = 0.8;
const FACTOR_MIN = 0.6;
const FACTOR_MAX = 1.2;
const DEPTH_BONUS = 0.15;
const DEPTH_MIN_GAMES = 5;

const SHARE_FLOOR = 0.15;
const SHARE_SPAN = 0.45;
const ONE_TRICK_FULL_GAMES = 150;
/** One trick a partir daqui garante uma nota mínima: base + span × one trick. */
const OTP_FLOOR_MIN = 0.25;
const OTP_FLOOR_BASE = 55;
const OTP_FLOOR_SPAN = 40;
/** A partir daqui o card ganha o selo "one trick". */
const ONE_TRICK_BADGE_SHARE = 0.35;
const ONE_TRICK_BADGE_GAMES = 60;

const HIGH_THREAT = 70;
const MEDIUM_THREAT = 50;

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const gamesOf = (u: BanUsage) => u.seasonGames + u.trainingGames + u.championshipGames;
const competitiveGames = (u: BanUsage) => u.trainingGames + u.championshipGames;
const competitiveWins = (u: BanUsage) => u.trainingWins + u.championshipWins;
const volume = (c: BanChampion) => c.usage.reduce((s, u) => s + gamesOf(u), 0);

/** WR só de treino + jogo oficial; null quando o jogador não tem nenhum no campeão. */
function competitiveWinrate(u: BanUsage): number | null {
  const g = competitiveGames(u);
  return g > 0 ? competitiveWins(u) / g : null;
}

function mastery(u: BanUsage): number {
  const vol = Math.sqrt(clamp01(gamesOf(u) / FULL_VOLUME_GAMES));
  const g = competitiveGames(u);
  if (g === 0) return vol;

  const smoothed = (competitiveWins(u) + PRIOR_GAMES / 2) / (g + PRIOR_GAMES);
  const factor = Math.max(
    FACTOR_MIN,
    Math.min(FACTOR_MAX, 1 + WINRATE_SENSITIVITY * (smoothed - 0.5)),
  );
  return clamp01(vol * factor);
}

function oneTrickness(u: BanUsage): number {
  const concentration = clamp01((u.seasonShare - SHARE_FLOOR) / SHARE_SPAN);
  return concentration * clamp01(u.seasonGames / ONE_TRICK_FULL_GAMES);
}

function threatOf(score: number): BanThreat {
  return score >= HIGH_THREAT ? "alta" : score >= MEDIUM_THREAT ? "media" : "baixa";
}

function recommend(
  champion: BanChampion,
  tier: BanTier | null,
  bannedAgainst: number,
): BanRecommendation | null {
  if (volume(champion) < MIN_TEAM_GAMES) return null;

  const ranked = champion.usage
    .map((u) => ({ u, m: mastery(u) }))
    .sort((a, b) => b.m - a.m || gamesOf(b.u) - gamesOf(a.u));

  const best = ranked[0]?.m ?? 0;
  const depth = Math.min(ranked.filter((r) => gamesOf(r.u) >= DEPTH_MIN_GAMES).length, 3) / 3;
  const domain = clamp01(best + DEPTH_BONUS * depth);
  const oneTrick = Math.max(0, ...champion.usage.map(oneTrickness));
  const weighted =
    100 *
    (MASTERY_WEIGHT * domain +
      ONE_TRICK_WEIGHT * oneTrick +
      TIER_WEIGHT * (tier ? TIER_VALUE[tier] : 0));
  const floor =
    oneTrick >= OTP_FLOOR_MIN ? OTP_FLOOR_BASE + OTP_FLOOR_SPAN * oneTrick : 0;
  const score = Math.min(100, Math.max(weighted, floor));

  const otp = champion.usage
    .filter((u) => u.seasonShare >= ONE_TRICK_BADGE_SHARE && u.seasonGames >= ONE_TRICK_BADGE_GAMES)
    .sort((a, b) => b.seasonShare - a.seasonShare)[0];

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
      competitiveGames: competitiveGames(u),
      competitiveWinrate: competitiveWinrate(u),
    })),
    bannedAgainst,
    oneTrick: otp ? { player: otp.player, share: otp.seasonShare, games: otp.seasonGames } : null,
  };
}

// ---------------------------------------------------------------------------

interface SeasonChampion extends ChampionRef {
  games: number;
  wins: number;
}

interface SeasonData {
  /** Total de partidas ranqueadas do jogador na temporada. */
  total: number;
  champions: SeasonChampion[];
}

/**
 * Campeões da temporada ranqueada de um jogador. O MCP resolve nicks trocados e
 * dá o top 10; a lista completa vem do site do OP.GG. Se o site falhar, ficamos
 * com o top 10 do MCP.
 */
async function loadSeason(
  riotId: string | null,
  teamName: string,
): Promise<SeasonData | null> {
  if (!riotId) return null;

  const stats = await getPlayerStats(riotId, "season", teamName);
  try {
    const pool = await getSeasonPool(stats.riotId);
    const champions = await Promise.all(
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
    return { total: pool.games, champions };
  } catch (err) {
    console.error(`[bans] lista completa indisponível para ${stats.riotId}:`, err);
    return {
      total: stats.games,
      champions: stats.champions.map((c) => ({
        id: c.championId,
        name: c.championName,
        iconUrl: c.iconUrl,
        games: c.games,
        wins: c.wins,
      })),
    };
  }
}

/**
 * Bans sugeridos contra um time: ranking único que mistura a tier list dos
 * campeões mais roubados com o que cada jogador joga bem (temporada ranqueada
 * inteira + treinos + partidas do campeonato do próprio time). Devolve os 5 mais prioritários e os 10 seguintes.
 */
export async function getTeamBans(slug: string): Promise<TeamBans | null> {
  const data = await getTeam(slug);
  if (!data) return null;

  const [trainings, championship, seasons] = await Promise.all([
    getTeamTrainings(slug),
    getTeamChampionship(slug),
    Promise.allSettled(data.players.map((p) => loadSeason(p.riotId, data.team.name))),
  ]);

  const meta = new Map<string, ChampionRef>();
  // championId (ddragon) → jogador → uso
  const usage = new Map<string, Map<string, BanUsage>>();
  const entry = (championId: string, player: string): BanUsage => {
    const byPlayer = usage.get(championId) ?? new Map<string, BanUsage>();
    let u = byPlayer.get(player);
    if (!u) {
      u = {
        player,
        seasonGames: 0,
        seasonWins: 0,
        seasonShare: 0,
        trainingGames: 0,
        trainingWins: 0,
        championshipGames: 0,
        championshipWins: 0,
      };
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
    for (const c of season.value.champions) {
      meta.set(c.id, { id: c.id, name: c.name, iconUrl: c.iconUrl });
      const u = entry(c.id, player.name);
      u.seasonGames += c.games;
      u.seasonWins += c.wins;
      u.seasonShare = season.value.total > 0 ? u.seasonGames / season.value.total : 0;
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

  // Campeonato: partidas oficiais, com vitória exata por jogo.
  for (const p of championship.pools) {
    for (const c of p.champions) {
      meta.set(c.id, { id: c.id, name: c.name, iconUrl: c.iconUrl });
      const u = entry(c.id, p.nick);
      u.championshipGames += c.games;
      u.championshipWins += c.wins;
    }
  }

  const bannedAgainstById = new Map<string, number>(
    championship.bannedAgainst.map((b) => [b.champion.id, b.count]),
  );

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
    .map((id) => recommend(toChampion(id), tierById.get(id) ?? null, bannedAgainstById.get(id) ?? 0))
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
