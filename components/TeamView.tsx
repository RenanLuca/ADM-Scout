"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PlayerCard } from "@/components/PlayerCard";
import { TeamLogo } from "@/components/TeamLogo";
import { BansTab } from "@/components/team/BansTab";
import { ChampionshipTab } from "@/components/team/ChampionshipTab";
import { LineupNotice, LineupPanel } from "@/components/team/LineupPanel";
import { TrainingsTab } from "@/components/team/TrainingsTab";
import { useLineup } from "@/components/team/lineup";
import { LaneHeading } from "@/components/team/shared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, fetchTeam } from "@/lib/api";
import { groupByLane } from "@/lib/lanes";
import type { StatsMode, TeamWithPlayers } from "@/lib/types";

type Tab = "history" | "championship" | "trainings" | "bans";

const TABS: { value: Tab; label: string }[] = [
  { value: "history", label: "Histórico" },
  { value: "championship", label: "Campeonato" },
  { value: "trainings", label: "Treinos" },
  { value: "bans", label: "Possíveis bans" },
];

const MODES: { value: StatsMode; label: string }[] = [
  { value: "season", label: "Temporada" },
  { value: "recent", label: "Últimas 20 partidas" },
];

function TeamLayout({ slug, data }: { slug: string; data: TeamWithPlayers }) {
  const [tab, setTab] = useState<Tab>("history");
  const [mode, setMode] = useState<StatsMode>("season");
  const lineup = useLineup(slug, data.players);

  const visiblePlayers = lineup.active
    ? data.players.filter((p) => lineup.isSelected(p.slug))
    : data.players;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <TeamLogo slug={data.team.slug} name={data.team.name} size={64} />
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{data.team.name}</h1>
          {data.team.presidents && (
            <p className="text-sm text-muted-foreground">Presidentes: {data.team.presidents}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start lg:gap-8">
        {/* A escalação fica visível em qualquer aba; no celular vem antes das abas. */}
        <LineupPanel
          players={data.players}
          lineup={lineup}
          className="order-first lg:sticky lg:top-4 lg:order-last"
        />

        <div className="min-w-0 space-y-6">
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

          <LineupNotice players={data.players} lineup={lineup} />

          {tab === "history" && (
            <div className="space-y-6">
              <div
                role="group"
                aria-label="Período das estatísticas"
                className="flex flex-wrap gap-2"
              >
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
              {groupByLane(visiblePlayers).map(({ role, items }) => (
                <section key={role ?? "none"} className="space-y-3">
                  <LaneHeading role={role} count={items.length} />
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {items.map((player) => (
                      <PlayerCard key={player.slug} teamSlug={slug} player={player} mode={mode} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          {tab === "championship" && <ChampionshipTab slug={slug} lineup={lineup} />}
          {tab === "trainings" && <TrainingsTab slug={slug} lineup={lineup} />}
          {tab === "bans" && <BansTab slug={slug} lineup={lineup} />}
        </div>
      </div>
    </div>
  );
}

export function TeamView({ slug }: { slug: string }) {
  const { data, error, isPending, isFetching, refetch } = useQuery({
    queryKey: ["team", slug],
    queryFn: () => fetchTeam(slug),
  });

  if (isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-72" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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

  return <TeamLayout slug={slug} data={data} />;
}
