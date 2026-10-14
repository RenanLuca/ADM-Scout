import type { PickEntry, PicksData } from "@/lib/picks";
import type { Role } from "@/lib/types";

export interface EntryKey {
  playerId: number;
  lane: Role;
  championId: string;
}

export interface MoveVars extends EntryKey {
  categoryId: number;
  index: number;
}

const sameEntry = (e: PickEntry, k: EntryKey) =>
  e.playerId === k.playerId && e.lane === k.lane && e.championId === k.championId;

/** Entradas do quadro de um jogador numa rota, na ordem de cada categoria. */
export function boardEntries(data: PicksData, playerId: number, lane: Role): PickEntry[] {
  return data.entries
    .filter((e) => e.playerId === playerId && e.lane === lane)
    .sort((a, b) => a.position - b.position);
}

/**
 * Resultado otimista de mover/inserir um campeão: espelha o que o servidor faz
 * (tira da categoria antiga, insere em `index` e renumera as posições).
 */
export function applyMove(data: PicksData, v: MoveVars): PicksData {
  const existing = data.entries.find((e) => sameEntry(e, v));
  const rest = data.entries.filter((e) => !sameEntry(e, v));

  const siblings = rest
    .filter((e) => e.playerId === v.playerId && e.lane === v.lane && e.categoryId === v.categoryId)
    .sort((a, b) => a.position - b.position);

  const moving: PickEntry = existing
    ? { ...existing, categoryId: v.categoryId }
    : {
        id: -Date.now(), // provisório até o servidor responder
        playerId: v.playerId,
        lane: v.lane,
        championId: v.championId,
        categoryId: v.categoryId,
        position: 0,
      };

  const ordered = [...siblings];
  ordered.splice(Math.min(v.index, ordered.length), 0, moving);

  const untouched = rest.filter((e) => !siblings.includes(e));
  return {
    ...data,
    entries: [...untouched, ...ordered.map((e, position) => ({ ...e, position }))],
  };
}

export function applyRemove(data: PicksData, k: EntryKey): PicksData {
  return { ...data, entries: data.entries.filter((e) => !sameEntry(e, k)) };
}
