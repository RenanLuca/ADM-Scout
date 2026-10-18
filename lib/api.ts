import type {
  CategoryColor,
  ChampionOption,
  PickCategory,
  PicksData,
} from "./picks";
import type { Role } from "./types";
import type {
  ApiErrorBody,
  ApiErrorCode,
  PlayerStats,
  StatsMode,
  Team,
  TeamWithPlayers,
  TeamBans,
  TeamChampionship,
  TeamDraft,
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

/** Sessão expirada: volta para a tela de senha e retorna depois para onde estava. */
function redirectToLogin() {
  if (typeof window === "undefined") return;
  const here = `${window.location.pathname}${window.location.search}`;
  // Navegação completa de propósito (fora de componente): descarta o estado em memória.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.href = `/entrar?next=${encodeURIComponent(here)}`;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    if (res.status === 401) redirectToLogin();
    const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(body?.error ?? "Algo deu errado.", body?.code ?? "unknown");
  }
  return res.json() as Promise<T>;
}

const getJson = <T>(url: string) => request<T>(url);

const sendJson = <T = { ok: true }>(method: string, url: string, body?: unknown) =>
  request<T>(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

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

export const fetchTeamBans = (slug: string, players: string[] = []) =>
  getJson<TeamBans>(
    `/api/times/${slug}/bans${players.length ? `?players=${players.join(",")}` : ""}`,
  );

export const fetchTeamDraft = (slug: string, players: string[] = []) =>
  getJson<TeamDraft>(
    `/api/times/${slug}/draft${players.length ? `?players=${players.join(",")}` : ""}`,
  );

export const fetchTeamChampionship = (slug: string) =>
  getJson<TeamChampionship>(`/api/times/${slug}/campeonato`);

// ---------------------------------------------------------------------------
// Nossos Picks
// ---------------------------------------------------------------------------

export const fetchPicks = () => getJson<PicksData>("/api/nossos-picks");

export const fetchChampions = () => getJson<ChampionOption[]>("/api/champions");

export interface PlayerInput {
  name: string;
  lanes: Role[];
}

export const createPlayer = (input: PlayerInput) =>
  sendJson<{ id: number }>("POST", "/api/nossos-picks/players", input);

export const updatePlayer = (id: number, input: Partial<PlayerInput>) =>
  sendJson("PATCH", `/api/nossos-picks/players/${id}`, input);

export const deletePlayer = (id: number) =>
  sendJson("DELETE", `/api/nossos-picks/players/${id}`);

export const createCategory = (input: { name: string; color: CategoryColor }) =>
  sendJson<{ id: number }>("POST", "/api/nossos-picks/categories", input);

export const updateCategory = (
  id: number,
  input: Partial<Pick<PickCategory, "name" | "color">>,
) => sendJson("PATCH", `/api/nossos-picks/categories/${id}`, input);

export const deleteCategory = (id: number) =>
  sendJson("DELETE", `/api/nossos-picks/categories/${id}`);

export const reorderCategories = (ids: number[]) =>
  sendJson("PUT", "/api/nossos-picks/categories/order", { ids });

export interface EntryTarget {
  playerId: number;
  lane: Role;
  championId: string;
}

export const putEntry = (input: EntryTarget & { categoryId: number; index: number }) =>
  sendJson("PUT", "/api/nossos-picks/entries", input);

export const deleteEntry = (input: EntryTarget) =>
  sendJson("DELETE", "/api/nossos-picks/entries", input);

export const logout = () => sendJson("DELETE", "/api/entrar");
