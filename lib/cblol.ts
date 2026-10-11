import { cacheLife } from "next/cache";
import { opggUrlFor, riotIdFromOpgg, getRiotIdOverride } from "./riot-ids";
import type { Player, Role, Team, TeamWithPlayers } from "./types";

// API JSON usada pelo próprio site cblow.xyz (descoberta no bundle do front).
const API_URL = "https://api.cblow.xyz";

export const ROLES: Record<string, Role> = {
  top: "TOP",
  jungle: "JUNGLE",
  mid: "MID",
  adc: "ADC",
  support: "SUPPORT",
};

interface ApiPresident {
  name: string;
}

interface ApiTeam {
  slug: string;
  name: string;
  presidents?: ApiPresident[];
}

interface ApiPlayer {
  slug: string;
  nick: string;
  role: string;
  reserve: boolean;
  opggUrl: string | null;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) throw new Error(`api.cblow.xyz respondeu ${res.status} em ${path}`);
  return res.json() as Promise<T>;
}

function toTeam(t: ApiTeam): Team {
  const presidents = t.presidents?.map((p) => p.name).join(" e ");
  return { slug: t.slug, name: t.name, presidents: presidents || null };
}

export async function getTeams(): Promise<Team[]> {
  "use cache";
  cacheLife("hours");

  const teams = await apiGet<ApiTeam[]>("/teams");
  return teams.map(toTeam);
}

async function fetchTeam(
  slug: string,
): Promise<{ team: Team; players: ApiPlayer[] } | null> {
  "use cache";
  cacheLife("hours");

  // Valida o slug contra a lista de times antes de montar a URL.
  const teams = await getTeams();
  if (!teams.some((t) => t.slug === slug)) return null;

  const data = await apiGet<ApiTeam & { players: ApiPlayer[] }>(`/teams/${slug}`);
  return { team: toTeam(data), players: data.players };
}

/** Elenco (cacheado) + Riot IDs, lidos a cada chamada para o override em data/riot-ids.json valer na hora. */
export async function getTeam(slug: string): Promise<TeamWithPlayers | null> {
  const data = await fetchTeam(slug);
  if (!data) return null;

  const players: Player[] = data.players.map((p) => {
    const override = getRiotIdOverride(p.slug);
    const riotId =
      override !== undefined
        ? override
        : p.opggUrl
          ? riotIdFromOpgg(p.opggUrl)
          : null;
    return {
      slug: p.slug,
      name: p.nick,
      role: ROLES[p.role] ?? null,
      reserve: p.reserve,
      riotId,
      // Com override o link do cblow.xyz pode estar desatualizado: monta a partir do Riot ID.
      opggUrl: riotId ? (override ? opggUrlFor(riotId) : (p.opggUrl ?? opggUrlFor(riotId))) : null,
    };
  });

  // Titulares primeiro, depois reservas; dentro de cada grupo, ordem de rota.
  const order: Role[] = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"];
  players.sort(
    (a, b) =>
      Number(a.reserve) - Number(b.reserve) ||
      (a.role ? order.indexOf(a.role) : 9) - (b.role ? order.indexOf(b.role) : 9),
  );

  return { team: data.team, players };
}
