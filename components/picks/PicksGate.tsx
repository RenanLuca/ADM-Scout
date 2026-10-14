"use client";

import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, fetchChampions, fetchPicks } from "@/lib/api";
import type { ChampionOption, PicksData } from "@/lib/picks";

export interface PicksContext {
  data: PicksData;
  champions: ChampionOption[];
}

/** Carrega jogadores, categorias, entradas e campeões, e cuida de loading e erro. */
export function PicksGate({ children }: { children: (ctx: PicksContext) => ReactNode }) {
  const picks = useQuery({ queryKey: ["picks"], queryFn: fetchPicks });
  const champions = useQuery({
    queryKey: ["champions"],
    queryFn: fetchChampions,
    staleTime: Infinity,
  });

  if (picks.isPending || champions.isPending) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    );
  }

  if (picks.error || champions.error) {
    const err = picks.error ?? champions.error;
    return (
      <div className="space-y-3">
        <p role="alert" className="text-sm text-rose-400">
          {err instanceof ApiError ? err.message : "Não foi possível carregar os dados."}
        </p>
        <Button
          variant="outline"
          onClick={() => {
            void picks.refetch();
            void champions.refetch();
          }}
        >
          Tentar de novo
        </Button>
      </div>
    );
  }

  return <>{children({ data: picks.data, champions: champions.data })}</>;
}
