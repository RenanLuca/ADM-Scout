"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PlayerCard } from "@/components/PlayerCard";
import { BansTab } from "@/components/team/BansTab";
import { TrainingsTab } from "@/components/team/TrainingsTab";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, fetchTeam } from "@/lib/api";
import type { StatsMode } from "@/lib/types";

type Tab = "history" | "trainings" | "bans";

const TABS: { value: Tab; label: string }[] = [
  { value: "history", label: "Histórico" },
  { value: "trainings", label: "Treinos" },
  { value: "bans", label: "Possíveis bans" },
];

const MODES: { value: StatsMode; label: string }[] = [
  { value: "season", label: "Temporada" },
  { value: "recent", label: "Últimas 10 partidas" },
];

export function TeamView({ slug }: { slug: string }) {
  const [tab, setTab] = useState<Tab>("history");
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

      <div
        role="tablist"
        aria-label="Seções do time"
        className="flex gap-1 border-b border-foreground/10"
      >
        {TABS.map((t) => (
          <button
            key={t.value}
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => setTab(t.value)}
            className={
              tab === t.value
                ? "-mb-px whitespace-nowrap border-b-2 border-foreground px-3 py-2 text-sm font-medium sm:px-4"
                : "-mb-px whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground hover:text-foreground sm:px-4"
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "history" && (
        <div className="space-y-6">
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
      )}

      {tab === "trainings" && <TrainingsTab slug={slug} />}
      {tab === "bans" && <BansTab slug={slug} />}
    </div>
  );
}
