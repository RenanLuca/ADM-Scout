import { cacheLife } from "next/cache";
import { apiGet, ROLES } from "./cblol";
import { championIconUrl, resolveChampion } from "./ddragon";
import type {
  ChampionRef,
  PlayerPool,
  Role,
  Training,
  TrainingPick,
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

const ROLE_ORDER: Role[] = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"];

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

  // Pool por jogador (agrupado por time + nick).
  const teamNames = new Map<string, string>();
  const acc = new Map<
    string,
    { nick: string; teamSlug: string; roles: Map<Role, number>; games: number; champs: Map<string, number> }
  >();
  for (const t of trainings) {
    teamNames.set(t.team1.slug, t.team1.name);
    teamNames.set(t.team2.slug, t.team2.name);
    for (const g of t.games) {
      for (const p of g.picks) {
        const key = `${p.teamSlug}|${p.nick}`;
        const e = acc.get(key) ?? {
          nick: p.nick,
          teamSlug: p.teamSlug,
          roles: new Map(),
          games: 0,
          champs: new Map(),
        };
        e.games += 1;
        if (p.role) e.roles.set(p.role, (e.roles.get(p.role) ?? 0) + 1);
        e.champs.set(p.champion.id, (e.champs.get(p.champion.id) ?? 0) + 1);
        acc.set(key, e);
      }
    }
  }

  const byId = new Map<string, ChampionRef>();
  for (const c of champions.values()) byId.set(c.id, c);

  const pools: PlayerPool[] = [...acc.entries()].map(([key, e]) => ({
    nick: e.nick,
    slug: slugByTeamAndNick.get(key) ?? null,
    teamSlug: e.teamSlug,
    teamName: teamNames.get(e.teamSlug) ?? e.teamSlug,
    role: [...e.roles.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
    games: e.games,
    champions: [...e.champs.entries()]
      .map(([id, games]) => ({ ...byId.get(id)!, games }))
      .sort((a, b) => b.games - a.games || a.name.localeCompare(b.name)),
  }));

  pools.sort(
    (a, b) =>
      a.teamName.localeCompare(b.teamName) ||
      (a.role ? ROLE_ORDER.indexOf(a.role) : 9) - (b.role ? ROLE_ORDER.indexOf(b.role) : 9) ||
      b.games - a.games,
  );

  return { trainings, pools };
}
