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
  /** "Nome#TAG", extraído do link do OP.GG do cblow.xyz (ou do nick cadastrado no banco). */
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

export type ApiErrorCode = "not_found" | "no_riot_id" | "invalid" | "unauthorized" | "unknown";

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
  /** Vitórias estimadas: o cblow.xyz só informa o placar da série, não o vencedor de cada jogo. */
  wins: number;
  champions: (ChampionRef & { games: number; wins: number })[];
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
  /** Jogos e vitórias na temporada ranqueada (lista completa do OP.GG). */
  seasonGames: number;
  seasonWins: number;
  /** Fatia (0–1) das partidas ranqueadas do jogador feitas com este campeão. */
  seasonShare: number;
  trainingGames: number;
  /** Vitórias estimadas em treino: o cblow.xyz só informa o placar da série, não o vencedor de cada jogo. */
  trainingWins: number;
  /** Partidas oficiais do campeonato (vitórias exatas). */
  championshipGames: number;
  championshipWins: number;
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

export type BanThreat = "alta" | "media" | "baixa";

/** Um campeão recomendado para ban, com a nota e os motivos. */
export interface BanRecommendation extends ChampionRef {
  /** 0–100: 25% domínio, 10% one trick, 40% tier list e 25% campeonato. */
  score: number;
  threat: BanThreat;
  /** Posição na tier list dos mais roubados, se estiver nela. */
  tier: BanTier | null;
  /** Lane do jogador que mais domina o campeão. */
  lane: Role | null;
  /** Jogadores do time que dominam o campeão, do mais ao menos relevante (máx. 3). */
  players: (BanUsage & {
    /** Soloq + treinos + campeonato. */
    games: number;
    /** Rota cadastrada do jogador no cblow.xyz. */
    role: Role | null;
    /** Treinos + jogos oficiais. */
    competitiveGames: number;
    /** WR só de treino + jogo oficial; null se o jogador não tem nenhum no campeão. */
    competitiveWinrate: number | null;
  })[];
  /** Quantas vezes os adversários baniram esse campeão contra este time. */
  bannedAgainst: number;
  /** Partidas oficiais do campeonato com este campeão, somando o time todo. */
  championship: { games: number; wins: number };
  /** Jogador que concentra boa parte das suas partidas ranqueadas neste campeão. */
  oneTrick: { player: string; share: number; games: number } | null;
}

export interface TeamBans {
  team: { slug: string; name: string };
  /** Bans sugeridos (até 20), do mais ao menos prioritário. */
  bans: BanRecommendation[];
  /** Melhores bans de cada lane (pela lane de quem mais domina o campeão). */
  byLane: { role: Role | null; champions: BanRecommendation[] }[];
  /** Tier list completa, para consulta. */
  tiers: { tier: BanTier; champions: BanCandidate[] }[];
  /** Jogadores cujas estatísticas da temporada não puderam ser carregadas. */
  unavailable: string[];
}

/** Quão forte é o campeão na mão do jogador: melhores, bons e médios. */
export type DraftTier = "best" | "good" | "medium";

export interface DraftPick extends ChampionRef {
  usage: BanUsage;
  /** Soloq + treinos + campeonato. */
  games: number;
  /** WR só de treino + jogo oficial; null se não há nenhum no campeão. */
  competitiveWinrate: number | null;
}

export interface PlayerDraft {
  nick: string;
  slug: string;
  role: Role | null;
  picks: Record<DraftTier, DraftPick[]>;
}

export interface TeamDraft {
  team: { slug: string; name: string };
  players: PlayerDraft[];
  /** Jogadores cujas estatísticas da temporada não puderam ser carregadas. */
  unavailable: string[];
}

// ---------------------------------------------------------------------------
// Campeonato (partidas oficiais do CBLOW)
// ---------------------------------------------------------------------------

export interface ChampionshipTeam {
  slug: string;
  name: string;
  tag: string;
  score: number;
}

export interface ChampionshipLine {
  nick: string;
  /** slug do jogador no cblow.xyz */
  slug: string;
  role: Role | null;
  teamSlug: string;
  champion: ChampionRef;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
}

export interface ChampionshipCard {
  name: string;
  imageUrl: string | null;
}

export interface ChampionshipGame {
  number: number;
  winnerSlug: string;
  blueSlug: string;
  durationSec: number;
  /** Bans feitos por cada time (chave = slug do time). Vazio quando não foram registrados. */
  bans: Record<string, ChampionRef[]>;
  cards: Record<string, ChampionshipCard | null>;
  lines: ChampionshipLine[];
}

export interface ChampionshipMatch {
  id: number;
  stage: string;
  scheduledAt: string;
  bestOf: number;
  team1: ChampionshipTeam;
  team2: ChampionshipTeam;
  games: ChampionshipGame[];
}

export interface PlayerChampionshipPool {
  nick: string;
  slug: string;
  role: Role | null;
  games: number;
  wins: number;
  kda: number;
  champions: (ChampionRef & { games: number; wins: number; kda: number })[];
}

export interface BanCount {
  champion: ChampionRef;
  count: number;
}

export interface TeamChampionship {
  team: { slug: string; name: string; tag: string };
  record: { matches: number; wins: number; losses: number; avgDurationMin: number };
  /** Partidas do time, da mais recente para a mais antiga. */
  matches: ChampionshipMatch[];
  pools: PlayerChampionshipPool[];
  /** Campeões que o time baniu. */
  bannedByTeam: BanCount[];
  /** Campeões que os adversários baniram contra o time. */
  bannedAgainst: BanCount[];
}
