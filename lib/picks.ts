import { LANE_ORDER } from "./lanes";
import type { ChampionRef, Role } from "./types";

// ---------------------------------------------------------------------------
// Tipos compartilhados entre servidor e tela ("Nossos Picks")
// ---------------------------------------------------------------------------

export interface PickPlayer {
  id: number;
  name: string;
  lanes: Role[];
  position: number;
}

export interface PickCategory {
  id: number;
  name: string;
  color: CategoryColor;
  position: number;
}

export interface PickEntry {
  id: number;
  playerId: number;
  lane: Role;
  /** id do campeão no Data Dragon */
  championId: string;
  categoryId: number;
  position: number;
}

export interface PicksData {
  team: { slug: string; name: string };
  players: PickPlayer[];
  categories: PickCategory[];
  entries: PickEntry[];
}

/** Campeão da lista, com as rotas em que costuma jogar (vazio = sem dado). */
export type ChampionOption = ChampionRef & { lanes: Role[] };

// ---------------------------------------------------------------------------
// Cores das categorias (tokens guardados no banco)
// ---------------------------------------------------------------------------

export const CATEGORY_COLORS = ["slate", "emerald", "sky", "amber", "rose", "violet"] as const;
export type CategoryColor = (typeof CATEGORY_COLORS)[number];

export const isCategoryColor = (v: unknown): v is CategoryColor =>
  typeof v === "string" && (CATEGORY_COLORS as readonly string[]).includes(v);

// ---------------------------------------------------------------------------
// Validação das entradas das rotas (sem dependências extras)
// ---------------------------------------------------------------------------

export class InputError extends Error {}

export const isLane = (v: unknown): v is Role =>
  typeof v === "string" && (LANE_ORDER as string[]).includes(v);

export function parseId(v: unknown, label = "id"): number {
  const n = typeof v === "string" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isInteger(n) || n <= 0) {
    throw new InputError(`${label} inválido.`);
  }
  return n;
}

export function parseName(v: unknown, label = "Nome", max = 40): string {
  const s = typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "";
  if (s.length === 0) throw new InputError(`${label} é obrigatório.`);
  if (s.length > max) throw new InputError(`${label} pode ter até ${max} caracteres.`);
  return s;
}

export function parseLanes(v: unknown): Role[] {
  if (!Array.isArray(v) || v.length === 0 || !v.every(isLane)) {
    throw new InputError("Marque ao menos uma rota válida.");
  }
  // sem repetição, na ordem das lanes
  return LANE_ORDER.filter((l) => (v as Role[]).includes(l));
}

export function parseChampionId(v: unknown): string {
  if (typeof v !== "string" || !/^[A-Za-z0-9]{1,40}$/.test(v)) {
    throw new InputError("Campeão inválido.");
  }
  return v;
}

export function parseIndex(v: unknown): number {
  const n = typeof v === "number" ? v : Number.NaN;
  return Number.isInteger(n) && n >= 0 ? n : 0;
}
