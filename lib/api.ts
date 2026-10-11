import type {
  ApiErrorBody,
  ApiErrorCode,
  PlayerStats,
  StatsMode,
  Team,
  TeamWithPlayers,
  TeamBans,
  TeamTrainings,
} from "./types";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: ApiErrorCode,
  ) {
    super(message);
  }
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(body?.error ?? "Algo deu errado.", body?.code ?? "unknown");
  }
  return res.json() as Promise<T>;
}

export const fetchTeams = () => getJson<Team[]>("/api/times");

export const fetchTeam = (slug: string) =>
  getJson<TeamWithPlayers>(`/api/times/${slug}`);

export const fetchPlayerStats = (
  teamSlug: string,
  playerSlug: string,
  mode: StatsMode,
) => getJson<PlayerStats>(`/api/times/${teamSlug}/jogadores/${playerSlug}?mode=${mode}`);

export const fetchTeamTrainings = (slug: string) =>
  getJson<TeamTrainings>(`/api/times/${slug}/treinos`);

export const fetchTeamBans = (slug: string) => getJson<TeamBans>(`/api/times/${slug}/bans`);
