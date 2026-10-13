import { cacheLife } from "next/cache";
import { apiGet, ROLES } from "./cblol";
import { championIconUrl, resolveChampion } from "./ddragon";
import { laneIndex } from "./lanes";
import type {
  BanCount,
  ChampionRef,
  ChampionshipCard,
  ChampionshipGame,
  ChampionshipLine,
  ChampionshipMatch,
  PlayerChampionshipPool,
  Role,
  TeamChampionship,
} from "./types";

// ---------------------------------------------------------------------------
// Formato bruto de api.cblow.xyz
// ---------------------------------------------------------------------------

interface RawTeam {
  id: number;
  slug: string;
  name: string;
  tag: string;
}

interface RawMatchSummary {
  id: number;
  stage: string;
  bestOf: number;
  status: string;
  scheduledAt: string;
  team1: RawTeam;
  team2: RawTeam;
  team1Score: number;
  team2Score: number;
}

interface RawCard {
  name: string;
  imageUrl: string | null;
}

interface RawGame {
  number: number;
  winnerId: number | null;
  blueId: number | null;
  durationSec: number | null;
  // bans1/bans2 = bans FEITOS por team1/team2 (confirmado cruzando com os picks).
  bans1: string[];
  bans2: string[];
  card1: RawCard | null;
  card2: RawCard | null;
  lines: {
    player: { slug: string; nick: string; role: string };
    teamId: number;
    champion: string;
    kills: number;
    deaths: number;
    assists: number;
    cs: number;
  }[];
}

interface RawMatch extends RawMatchSummary {
  games: RawGame[];
}

// ---------------------------------------------------------------------------

interface ChampionshipData {
  matches: ChampionshipMatch[];
}

const card = (c: RawCard | null): ChampionshipCard | null =>
  c ? { name: c.name, imageUrl: c.imageUrl } : null;

const kdaOf = (k: number, d: number, a: number) => (k + a) / Math.max(d, 1);

/**
 * Partidas finalizadas do campeonato (com picks, bans, KDA e cartas). Cacheado por 5 min: as rodadas acontecem em dias
 * específicos, mas o cblow.xyz é atualizado à mão.
 */
async function getChampionshipData(): Promise<ChampionshipData> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 });

  const list = await apiGet<RawMatchSummary[]>("/matches");
  const finished = list.filter((m) => m.status === "finalizada");
  const raw = await Promise.all(finished.map((m) => apiGet<RawMatch>(`/matches/${m.id}`)));

  // Resolve cada nome de campeão uma vez (o cblow.xyz às vezes abrevia: "Miss", "Yori").
  const names = new Set<string>();
  for (const m of raw) {
    for (const g of m.games) {
      g.bans1.forEach((n) => names.add(n));
      g.bans2.forEach((n) => names.add(n));
      g.lines.forEach((l) => names.add(l.champion));
    }
  }

  const refs = new Map<string, ChampionRef>();
  await Promise.all(
    [...names].map(async (name) => {
      const c = await resolveChampion(name);
      refs.set(name, { id: c.id, name: c.name, iconUrl: championIconUrl(c.version, c.id) });
    }),
  );
  const ref = (name: string): ChampionRef =>
    refs.get(name) ?? { id: name, name, iconUrl: "" };

  const matches: ChampionshipMatch[] = raw.map((m) => {
    const slugById = new Map<number, string>([
      [m.team1.id, m.team1.slug],
      [m.team2.id, m.team2.slug],
    ]);

    const games: ChampionshipGame[] = [...m.games]
      .sort((a, b) => a.number - b.number)
      .map((g) => {
        const lines: ChampionshipLine[] = g.lines.map((l) => ({
          nick: l.player.nick,
          slug: l.player.slug,
          role: (ROLES[l.player.role] as Role | undefined) ?? null,
          teamSlug: slugById.get(l.teamId) ?? "",
          champion: ref(l.champion),
          kills: l.kills,
          deaths: l.deaths,
          assists: l.assists,
          cs: l.cs,
        }));

        return {
          number: g.number,
          winnerSlug: (g.winnerId && slugById.get(g.winnerId)) || "",
          blueSlug: (g.blueId && slugById.get(g.blueId)) || "",
          durationSec: g.durationSec ?? 0,
          bans: {
            [m.team1.slug]: g.bans1.map(ref),
            [m.team2.slug]: g.bans2.map(ref),
          },
          cards: {
            [m.team1.slug]: card(g.card1),
            [m.team2.slug]: card(g.card2),
          },
          lines,
        };
      });

    return {
      id: m.id,
      stage: m.stage,
      scheduledAt: m.scheduledAt,
      bestOf: m.bestOf,
      team1: { slug: m.team1.slug, name: m.team1.name, tag: m.team1.tag, score: m.team1Score },
      team2: { slug: m.team2.slug, name: m.team2.name, tag: m.team2.tag, score: m.team2Score },
      games,
    };
  });

  return { matches };
}

function countBans(lists: ChampionRef[][]): BanCount[] {
  const counts = new Map<string, BanCount>();
  for (const list of lists) {
    for (const champion of list) {
      const c = counts.get(champion.id) ?? { champion, count: 0 };
      c.count += 1;
      counts.set(champion.id, c);
    }
  }
  return [...counts.values()].sort(
    (a, b) => b.count - a.count || a.champion.name.localeCompare(b.champion.name),
  );
}

/** Histórico do time no campeonato: partidas, pool de campeões por jogador e bans. */
export async function getTeamChampionship(slug: string): Promise<TeamChampionship> {
  const { matches } = await getChampionshipData();

  const mine = matches
    .filter((m) => m.team1.slug === slug || m.team2.slug === slug)
    .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt) || b.id - a.id);

  const any = mine[0];
  const self = any ? (any.team1.slug === slug ? any.team1 : any.team2) : null;

  let wins = 0;
  let losses = 0;
  let totalSec = 0;
  let totalGames = 0;
  const byPlayer = new Map<
    string,
    {
      nick: string;
      slug: string;
      role: Role | null;
      games: number;
      wins: number;
      k: number;
      d: number;
      a: number;
      champs: Map<string, { ref: ChampionRef; games: number; wins: number; k: number; d: number; a: number }>;
    }
  >();
  const bannedByTeam: ChampionRef[][] = [];
  const bannedAgainst: ChampionRef[][] = [];

  for (const m of mine) {
    for (const g of m.games) {
      const won = g.winnerSlug === slug;
      if (g.winnerSlug) {
        if (won) wins += 1;
        else losses += 1;
      }
      totalSec += g.durationSec;
      totalGames += 1;

      for (const [teamSlug, bans] of Object.entries(g.bans)) {
        if (bans.length === 0) continue;
        (teamSlug === slug ? bannedByTeam : bannedAgainst).push(bans);
      }

      for (const l of g.lines) {
        if (l.teamSlug !== slug) continue;
        // O campeonato é poli-lane: o mesmo jogador vira um card por lane jogada.
        const playerKey = `${l.slug}|${l.role ?? "none"}`;
        const p = byPlayer.get(playerKey) ?? {
          nick: l.nick,
          slug: l.slug,
          role: l.role,
          games: 0,
          wins: 0,
          k: 0,
          d: 0,
          a: 0,
          champs: new Map(),
        };
        p.games += 1;
        p.wins += won ? 1 : 0;
        p.k += l.kills;
        p.d += l.deaths;
        p.a += l.assists;

        const c = p.champs.get(l.champion.id) ?? {
          ref: l.champion,
          games: 0,
          wins: 0,
          k: 0,
          d: 0,
          a: 0,
        };
        c.games += 1;
        c.wins += won ? 1 : 0;
        c.k += l.kills;
        c.d += l.deaths;
        c.a += l.assists;
        p.champs.set(l.champion.id, c);
        byPlayer.set(playerKey, p);
      }
    }
  }

  const pools: PlayerChampionshipPool[] = [...byPlayer.values()]
    .map((p) => ({
      nick: p.nick,
      slug: p.slug,
      role: p.role,
      games: p.games,
      wins: p.wins,
      kda: kdaOf(p.k, p.d, p.a),
      champions: [...p.champs.values()]
        .map((c) => ({
          ...c.ref,
          games: c.games,
          wins: c.wins,
          kda: kdaOf(c.k, c.d, c.a),
        }))
        .sort((a, b) => b.games - a.games || b.wins - a.wins),
    }))
    .sort(
      (a, b) =>
        laneIndex(a.role) - laneIndex(b.role) ||
        b.games - a.games ||
        a.nick.localeCompare(b.nick),
    );

  return {
    team: {
      slug,
      name: self?.name ?? slug,
      tag: self?.tag ?? "",
    },
    record: {
      matches: mine.length,
      wins,
      losses,
      avgDurationMin: totalGames ? Math.round(totalSec / totalGames / 60) : 0,
    },
    matches: mine,
    pools,
    bannedByTeam: countBans(bannedByTeam),
    bannedAgainst: countBans(bannedAgainst),
  };
}
