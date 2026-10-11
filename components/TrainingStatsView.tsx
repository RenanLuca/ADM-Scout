"use client";

import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchTrainingStats } from "@/lib/api";
import type { ChampionRef, PlayerPool, Role, Training } from "@/lib/types";

type Tab = "pools" | "trainings";

const ROLE_LABEL: Record<Role, string> = {
  TOP: "Top",
  JUNGLE: "Jungle",
  MID: "Mid",
  ADC: "ADC",
  SUPPORT: "Suporte",
};

const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

function ChampionIcon({ champion, size = 28 }: { champion: ChampionRef; size?: number }) {
  return (
    <Image
      src={champion.iconUrl}
      alt={champion.name}
      title={champion.name}
      width={size}
      height={size}
      className="shrink-0 rounded-md ring-1 ring-foreground/10"
      style={{ width: size, height: size }}
    />
  );
}

function PoolRow({ pool }: { pool: PlayerPool }) {
  return (
    <li className="space-y-2 py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-sm font-medium">{pool.nick}</span>
        {pool.role && <Badge variant="secondary">{ROLE_LABEL[pool.role]}</Badge>}
        <span className="text-xs text-muted-foreground">
          {pool.games} {pool.games === 1 ? "jogo" : "jogos"}
        </span>
      </div>
      <ul className="flex flex-wrap gap-2">
        {pool.champions.map((c) => (
          <li
            key={c.id}
            className="flex items-center gap-1.5 rounded-lg bg-muted/50 py-1 pl-1 pr-2 text-xs"
          >
            <ChampionIcon champion={c} size={24} />
            <span>{c.name}</span>
            <span className="tabular-nums text-muted-foreground">×{c.games}</span>
          </li>
        ))}
      </ul>
    </li>
  );
}

function PoolsTab({ pools, team }: { pools: PlayerPool[]; team: string | null }) {
  const groups = useMemo(() => {
    const map = new Map<string, { name: string; pools: PlayerPool[] }>();
    for (const p of pools) {
      if (team && p.teamSlug !== team) continue;
      const g = map.get(p.teamSlug) ?? { name: p.teamName, pools: [] };
      g.pools.push(p);
      map.set(p.teamSlug, g);
    }
    return [...map.entries()];
  }, [pools, team]);

  if (groups.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum treino registrado.</p>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {groups.map(([slug, g]) => (
        <Card key={slug}>
          <CardHeader>
            <CardTitle className="text-base">{g.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-foreground/10">
              {g.pools.map((p) => (
                <PoolRow key={`${p.teamSlug}|${p.nick}`} pool={p} />
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TrainingCard({ training }: { training: Training }) {
  const { team1, team2 } = training;
  const winner =
    team1.score === team2.score ? null : team1.score > team2.score ? team1.slug : team2.slug;

  return (
    <Card>
      <CardHeader>
        <p className="text-xs text-muted-foreground">
          {dateFormat.format(new Date(training.playedAt))}
        </p>
        <CardTitle className="flex flex-wrap items-center gap-x-3 gap-y-1 text-base">
          <span className={winner === team1.slug ? "text-emerald-400" : undefined}>
            {team1.name}
          </span>
          <span className="tabular-nums text-muted-foreground">
            {team1.score} – {team2.score}
          </span>
          <span className={winner === team2.slug ? "text-emerald-400" : undefined}>
            {team2.name}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {training.games.map((game) => (
          <div key={game.n} className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Jogo {game.n}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {[team1, team2].map((team) => (
                <ul key={team.slug} className="space-y-1.5">
                  {game.picks
                    .filter((p) => p.teamSlug === team.slug)
                    .map((p) => (
                      <li key={`${p.nick}-${p.champion.id}`} className="flex items-center gap-2">
                        <ChampionIcon champion={p.champion} size={28} />
                        <div className="min-w-0 text-xs">
                          <p className="truncate font-medium">{p.champion.name}</p>
                          <p className="truncate text-muted-foreground">
                            {p.role ? `${ROLE_LABEL[p.role]} · ` : ""}
                            {p.nick}
                          </p>
                        </div>
                      </li>
                    ))}
                </ul>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function TrainingStatsView() {
  const [tab, setTab] = useState<Tab>("pools");
  const [team, setTeam] = useState<string | null>(null);
  const { data, error, isPending, isFetching, refetch } = useQuery({
    queryKey: ["training-stats"],
    queryFn: fetchTrainingStats,
  });

  const teams = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of data?.pools ?? []) map.set(p.teamSlug, p.teamName);
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [data]);

  const trainings = useMemo(
    () =>
      (data?.trainings ?? []).filter(
        (t) => !team || t.team1.slug === team || t.team2.slug === team,
      ),
    [data, team],
  );

  if (isPending) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <p role="alert" className="text-sm text-rose-400">
          {error.message}
        </p>
        <Button variant="outline" disabled={isFetching} onClick={() => refetch()}>
          {isFetching ? "Tentando…" : "Tentar de novo"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Seção">
        <Button
          size="sm"
          variant={tab === "pools" ? "default" : "outline"}
          aria-pressed={tab === "pools"}
          onClick={() => setTab("pools")}
        >
          Campeões por jogador
        </Button>
        <Button
          size="sm"
          variant={tab === "trainings" ? "default" : "outline"}
          aria-pressed={tab === "trainings"}
          onClick={() => setTab("trainings")}
        >
          Treinos ({data.trainings.length})
        </Button>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por time">
        <Button
          size="sm"
          variant={team === null ? "secondary" : "ghost"}
          onClick={() => setTeam(null)}
        >
          Todos os times
        </Button>
        {teams.map(([slug, name]) => (
          <Button
            key={slug}
            size="sm"
            variant={team === slug ? "secondary" : "ghost"}
            onClick={() => setTeam(slug)}
          >
            {name}
          </Button>
        ))}
      </div>

      {tab === "pools" ? (
        <PoolsTab pools={data.pools} team={team} />
      ) : trainings.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum treino registrado.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {trainings.map((t) => (
            <TrainingCard key={t.id} training={t} />
          ))}
        </div>
      )}
    </div>
  );
}
