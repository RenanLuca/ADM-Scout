import { cacheLife } from "next/cache";
import { apiGet, ROLES } from "./cblol";
import { championIconUrl, resolveChampion } from "./ddragon";
import { laneIndex } from "./lanes";
import type {
  ChampionRef,
  PlayerPool,
  Role,
  Training,
  TrainingPick,
  TeamTrainings,
  TrainingStats,
} from "./types";

interface RawTeam {
  id: number;
  slug: string;
  name: string;
}

interface RawTraining {
  id: number;
  playedAt: string;
  team1: RawTeam;
  team2: RawTeam;
  score1: number;
  score2: number;
  games: { n: number; picks: { teamId: number; nick: string; role: string; champion: string }[] }[];
}

interface RawPlayer {
  slug: string;
  nick: string;
  team: { slug: string };
}

/**
 * Treinos entre os times (picks por jogador em cada jogo) e o pool de campeões
 * de cada jogador nesses treinos. O cblow.xyz não informa o vencedor de cada
 * jogo, só o placar da série, então não há winrate por campeão.
 */
export async function getTrainingStats(): Promise<TrainingStats> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 });

  const [raw, players] = await Promise.all([
    apiGet<RawTraining[]>("/trainings"),
    apiGet<RawPlayer[]>("/players"),
  ]);

  const slugByTeamAndNick = new Map<string, string>(
    players.map((p) => [`${p.team.slug}|${p.nick}`, p.slug]),
  );

  // Resolve cada campeão uma vez (nome do cblow.xyz → id/nome/ícone do Data Dragon).
  const names = [...new Set(raw.flatMap((t) => t.games.flatMap((g) => g.picks.map((p) => p.champion))))];
  const champions = new Map<string, ChampionRef>();
  await Promise.all(
    names.map(async (name) => {
      const c = await resolveChampion(name);
      champions.set(name, { id: c.id, name: c.name, iconUrl: championIconUrl(c.version, c.id) });
    }),
  );

  const trainings: Training[] = raw
    .map((t) => {
      const slugById = new Map([
        [t.team1.id, t.team1.slug],
        [t.team2.id, t.team2.slug],
      ]);
      return {
        id: t.id,
        playedAt: t.playedAt,
        team1: { slug: t.team1.slug, name: t.team1.name, score: t.score1 },
        team2: { slug: t.team2.slug, name: t.team2.name, score: t.score2 },
        games: [...t.games]
          .sort((a, b) => a.n - b.n)
          .map((g) => ({
            n: g.n,
            picks: g.picks.map(
              (p): TrainingPick => ({
                teamSlug: slugById.get(p.teamId) ?? "",
                nick: p.nick,
                role: ROLES[p.role] ?? null,
                champion: champions.get(p.champion)!,
              }),
            ),
          })),
      };
    })
    .sort((a, b) => b.playedAt.localeCompare(a.playedAt) || b.id - a.id);

  // Pool por jogador e lane jogada (poli-lane: o mesmo jogador pode ter mais de um).
  const teamNames = new Map<string, string>();
  const acc = new Map<
    string,
    {
      nick: string;
      teamSlug: string;
      role: Role | null;
      games: number;
      wins: number;
      champs: Map<string, { games: number; wins: number }>;
    }
  >();
  for (const t of trainings) {
    teamNames.set(t.team1.slug, t.team1.name);
    teamNames.set(t.team2.slug, t.team2.name);
    // Cada jogo do time vale (vitórias da série ÷ jogos da série): exato em 3-0/2-0.
    const share = (teamSlug: string) => {
      const score = teamSlug === t.team1.slug ? t.team1.score : t.team2.score;
      return t.games.length ? score / t.games.length : 0;
    };
    for (const g of t.games) {
      for (const p of g.picks) {
        const key = `${p.teamSlug}|${p.nick}|${p.role ?? "none"}`;
        const e = acc.get(key) ?? {
          nick: p.nick,
          teamSlug: p.teamSlug,
          role: p.role,
          games: 0,
          wins: 0,
          champs: new Map(),
        };
        const w = share(p.teamSlug);
        e.games += 1;
        e.wins += w;
        const c = e.champs.get(p.champion.id) ?? { games: 0, wins: 0 };
        c.games += 1;
        c.wins += w;
        e.champs.set(p.champion.id, c);
        acc.set(key, e);
      }
    }
  }

  const byId = new Map<string, ChampionRef>();
  for (const c of champions.values()) byId.set(c.id, c);

  const pools: PlayerPool[] = [...acc.values()].map((e) => ({
    nick: e.nick,
    slug: slugByTeamAndNick.get(`${e.teamSlug}|${e.nick}`) ?? null,
    teamSlug: e.teamSlug,
    teamName: teamNames.get(e.teamSlug) ?? e.teamSlug,
    role: e.role,
    games: e.games,
    wins: e.wins,
    champions: [...e.champs.entries()]
      .map(([id, c]) => ({ ...byId.get(id)!, games: c.games, wins: c.wins }))
      .sort((a, b) => b.games - a.games || a.name.localeCompare(b.name)),
  }));

  pools.sort(
    (a, b) =>
      a.teamName.localeCompare(b.teamName) ||
      laneIndex(a.role) - laneIndex(b.role) ||
      b.games - a.games,
  );

  return { trainings, pools };
}

/** Treinos de que o time participou e o pool de campeões dos jogadores dele. */
export async function getTeamTrainings(slug: string): Promise<TeamTrainings | null> {
  const { trainings, pools } = await getTrainingStats();

  const mine = trainings.filter((t) => t.team1.slug === slug || t.team2.slug === slug);
  const team = mine
    .flatMap((t) => [t.team1, t.team2])
    .find((t) => t.slug === slug);
  if (!team) return null;

  return {
    team: { slug, name: team.name },
    trainings: mine,
    pools: pools.filter((p) => p.teamSlug === slug),
  };
}
