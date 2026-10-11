"use client";

import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { ChampionRow } from "@/components/ChampionRow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, fetchPlayerStats } from "@/lib/api";
import type { Player, Role, StatsMode } from "@/lib/types";

const TOP_CHAMPIONS = 5;

const ROLE_LABEL: Record<Role, string> = {
  TOP: "Top",
  JUNGLE: "Jungle",
  MID: "Mid",
  ADC: "ADC",
  SUPPORT: "Suporte",
};

function StatsSkeleton() {
  return (
    <div className="space-y-3" aria-label="Carregando estatísticas">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-md" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-7 w-14" />
        </div>
      ))}
    </div>
  );
}

function PlayerStatsBody({
  teamSlug,
  player,
  mode,
}: {
  teamSlug: string;
  player: Player;
  mode: StatsMode;
}) {
  const { data, error, isPending, isFetching, refetch } = useQuery({
    queryKey: ["player", teamSlug, player.slug, mode],
    queryFn: () => fetchPlayerStats(teamSlug, player.slug, mode),
  });

  if (isPending) return <StatsSkeleton />;

  if (error) {
    const message =
      error instanceof ApiError ? error.message : "Não foi possível carregar.";
    return (
      <div className="space-y-3">
        <p role="alert" className="text-sm text-rose-400">
          {message}
        </p>
        <Button
          variant="outline"
          size="sm"
          disabled={isFetching}
          onClick={() => refetch()}
        >
          {isFetching ? "Tentando…" : "Tentar de novo"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{data.elo}</span>
        <span className="text-xs text-muted-foreground">
          {data.mode === "season"
            ? `temporada ranqueada · ${data.games} jogos`
            : `últimas ${data.games} partidas`}
        </span>
      </div>
      {data.champions.length > 0 ? (
        <ul className="space-y-3">
          {data.champions.slice(0, TOP_CHAMPIONS).map((c) => (
            <ChampionRow key={c.championId} champion={c} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Nenhuma partida recente.</p>
      )}
    </div>
  );
}

export function PlayerCard({
  teamSlug,
  player,
  mode,
}: {
  teamSlug: string;
  player: Player;
  mode: StatsMode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="truncate text-base">{player.name}</CardTitle>
            {player.riotId && (
              <p className="truncate text-xs text-muted-foreground">{player.riotId}</p>
            )}
          </div>
          <div className="flex shrink-0 gap-1">
            {player.reserve && <Badge variant="outline">Reserva</Badge>}
            {player.role && <Badge variant="secondary">{ROLE_LABEL[player.role]}</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {player.riotId ? (
          <PlayerStatsBody teamSlug={teamSlug} player={player} mode={mode} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Sem link do OP.GG no cblow.xyz. Adicione{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">{player.slug}</code>{" "}
            em <code className="rounded bg-muted px-1 py-0.5 text-xs">data/riot-ids.json</code>.
          </p>
        )}
        {player.opggUrl && (
          <a
            href={player.opggUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Ver no OP.GG <ExternalLink className="size-3" />
          </a>
        )}
      </CardContent>
    </Card>
  );
}
