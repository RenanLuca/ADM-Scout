"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PlayerCard } from "@/components/PlayerCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, fetchTeam } from "@/lib/api";
import type { StatsMode } from "@/lib/types";

const MODES: { value: StatsMode; label: string }[] = [
  { value: "season", label: "Temporada" },
  { value: "recent", label: "Últimas 10 partidas" },
];

export function TeamView({ slug }: { slug: string }) {
  const [mode, setMode] = useState<StatsMode>("season");
  const { data, error, isPending, isFetching, refetch } = useQuery({
    queryKey: ["team", slug],
    queryFn: () => fetchTeam(slug),
  });

  if (isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <p role="alert" className="text-sm text-rose-400">
          {error instanceof ApiError ? error.message : "Algo deu errado."}
        </p>
        <Button variant="outline" disabled={isFetching} onClick={() => refetch()}>
          {isFetching ? "Tentando…" : "Tentar de novo"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{data.team.name}</h1>
        {data.team.presidents && (
          <p className="text-sm text-muted-foreground">
            Presidentes: {data.team.presidents}
          </p>
        )}
      </div>
      <div role="group" aria-label="Período das estatísticas" className="flex flex-wrap gap-2">
        {MODES.map((m) => (
          <Button
            key={m.value}
            size="sm"
            variant={mode === m.value ? "default" : "outline"}
            aria-pressed={mode === m.value}
            onClick={() => setMode(m.value)}
          >
            {m.label}
          </Button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.players.map((player) => (
          <PlayerCard key={player.slug} teamSlug={slug} player={player} mode={mode} />
        ))}
      </div>
    </div>
  );
}
