export type Role = "TOP" | "JUNGLE" | "MID" | "ADC" | "SUPPORT";

export interface Team {
  slug: string;
  name: string;
  presidents: string | null;
}

export interface Player {
  slug: string;
  name: string;
  role: Role | null;
  reserve: boolean;
  /** "Nome#TAG", extraído do link do OP.GG do cblow.xyz (ou do override em data/riot-ids.json). */
  riotId: string | null;
  opggUrl: string | null;
}

export interface TeamWithPlayers {
  team: Team;
  players: Player[];
}

export interface ChampionStat {
  championId: string;
  championName: string;
  iconUrl: string;
  games: number;
  wins: number;
  winrate: number;
  kda: number;
}

export type StatsMode = "season" | "recent";

export interface PlayerStats {
  riotId: string;
  mode: StatsMode;
  elo: string;
  /** Jogos considerados: da temporada ranqueada ou das últimas partidas. */
  games: number;
  champions: ChampionStat[];
}

export type ApiErrorCode = "not_found" | "no_riot_id" | "unknown";

export interface ApiErrorBody {
  error: string;
  code: ApiErrorCode;
}

export interface ChampionRef {
  id: string;
  name: string;
  iconUrl: string;
}

export interface TrainingPick {
  teamSlug: string;
  nick: string;
  role: Role | null;
  champion: ChampionRef;
}

export interface TrainingTeam {
  slug: string;
  name: string;
  score: number;
}

export interface Training {
  id: number;
  playedAt: string;
  team1: TrainingTeam;
  team2: TrainingTeam;
  games: { n: number; picks: TrainingPick[] }[];
}

export interface PlayerPool {
  nick: string;
  /** slug do jogador no cblow.xyz; null para nicks que não são jogadores cadastrados (ex.: "Jogador do chat") */
  slug: string | null;
  teamSlug: string;
  teamName: string;
  role: Role | null;
  games: number;
  champions: (ChampionRef & { games: number })[];
}

export interface TrainingStats {
  trainings: Training[];
  pools: PlayerPool[];
}

export interface TeamTrainings {
  team: { slug: string; name: string };
  trainings: Training[];
  pools: PlayerPool[];
}

export type BanTier = "S" | "A" | "B";

export interface BanUsage {
  player: string;
  seasonGames: number;
  trainingGames: number;
  /** Vitórias estimadas em treino: o cblow.xyz só informa o placar da série, não o vencedor de cada jogo. */
  trainingWins: number;
}

export interface BanChampion extends ChampionRef {
  /** Quem do time joga esse campeão, do mais usado para o menos. */
  usage: BanUsage[];
  seasonGames: number;
  trainingGames: number;
  trainingWins: number;
}

export interface BanCandidate extends BanChampion {
  tier: BanTier;
}

export interface TeamBans {
  team: { slug: string; name: string };
  /** Campeões da tier list dos mais roubados, por tier. */
  tiers: { tier: BanTier; champions: BanCandidate[] }[];
  /** Fora da tier list: campeões que o time vence bastante nos treinos. */
  trainingStandouts: BanChampion[];
  /** Fora da tier list: campeões com muitos jogos na soloq. */
  soloqMostPlayed: BanChampion[];
  /** Jogadores cujas estatísticas da temporada não puderam ser carregadas. */
  unavailable: string[];
}
