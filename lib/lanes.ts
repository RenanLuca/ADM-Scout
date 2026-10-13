import type { Role } from "./types";

/** Ordem das lanes em todo o app: Top, Jungle, Mid, ADC, Suporte. */
export const LANE_ORDER: Role[] = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"];

/** Posição da lane na ordem; jogador sem rota vai para o fim. */
export function laneIndex(role: Role | null): number {
  return role ? LANE_ORDER.indexOf(role) : LANE_ORDER.length;
}

/** Agrupa na ordem das lanes. Grupos sem jogadores não aparecem; "sem rota" vem por último. */
export function groupByLane<T extends { role: Role | null }>(
  items: T[],
): { role: Role | null; items: T[] }[] {
  const groups: { role: Role | null; items: T[] }[] = [];
  for (const role of [...LANE_ORDER, null] as (Role | null)[]) {
    const inLane = items.filter((i) => i.role === role);
    if (inLane.length > 0) groups.push({ role, items: inLane });
  }
  return groups;
}
