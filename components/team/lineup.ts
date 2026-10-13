import { useCallback, useMemo, useState } from "react";
import type { Player } from "@/lib/types";

/** Jogadores de um time numa partida: o alvo da escalação do draft. */
export const MAX_LINEUP = 5;

export interface Lineup {
  /** Slugs dos jogadores selecionados (na ordem do elenco). */
  slugs: string[];
  /** Nicks dos selecionados, para cruzar com treinos e campeonato (que só trazem o nick). */
  nicks: Set<string>;
  /**
   * As abas só filtram quando há uma seleção parcial. Com o elenco inteiro
   * selecionado (o padrão) ou com ninguém, nada é filtrado.
   */
  active: boolean;
  isSelected: (slug: string) => boolean;
  /** Mais jogadores marcados do que cabem numa partida. */
  overLimit: boolean;
  toggle: (slug: string) => void;
  /** Marca o elenco inteiro (o padrão). */
  selectAll: () => void;
  /** Desmarca todos; as abas voltam a mostrar o elenco inteiro. */
  clear: () => void;
}

const storageKey = (teamSlug: string) => `adm-scout:lineup:${teamSlug}`;

function read(teamSlug: string): string[] | null {
  try {
    const raw = window.localStorage.getItem(storageKey(teamSlug));
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) && parsed.every((s) => typeof s === "string") ? parsed : null;
  } catch {
    return null; // storage bloqueado ou JSON inválido: usa o padrão
  }
}

function write(teamSlug: string, slugs: string[]) {
  try {
    window.localStorage.setItem(storageKey(teamSlug), JSON.stringify(slugs));
  } catch {
    // sem persistência (aba privada, etc.): a seleção continua valendo na sessão
  }
}

/**
 * Seleção de jogadores do time, compartilhada por todas as abas e guardada no
 * navegador por time. Começa com todo o elenco marcado; o usuário desmarca até
 * chegar nos 5 do draft.
 */
export function useLineup(teamSlug: string, players: Player[]): Lineup {
  const [stored, setStored] = useState<string[] | null>(() =>
    typeof window === "undefined" ? null : read(teamSlug),
  );

  const rosterOrder = useMemo(() => players.map((p) => p.slug), [players]);

  const slugs = useMemo(() => {
    // Sem escolha salva: todos marcados.
    const chosen = new Set(stored ?? rosterOrder);
    return rosterOrder.filter((s) => chosen.has(s));
  }, [stored, rosterOrder]);

  const nicks = useMemo(
    () => new Set(players.filter((p) => slugs.includes(p.slug)).map((p) => p.name)),
    [players, slugs],
  );

  const commit = useCallback(
    (next: string[]) => {
      setStored(next);
      write(teamSlug, next);
    },
    [teamSlug],
  );

  const toggle = useCallback(
    (slug: string) => {
      commit(slugs.includes(slug) ? slugs.filter((s) => s !== slug) : [...slugs, slug]);
    },
    [slugs, commit],
  );

  return {
    slugs,
    nicks,
    active: slugs.length > 0 && slugs.length < rosterOrder.length,
    isSelected: (slug) => slugs.includes(slug),
    overLimit: slugs.length > MAX_LINEUP,
    toggle,
    selectAll: () => commit(rosterOrder),
    clear: () => commit([]),
  };
}
