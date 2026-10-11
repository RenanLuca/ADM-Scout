"use client";

import { useQuery } from "@tanstack/react-query";
import { TeamLogo } from "@/components/TeamLogo";
import { ChampionIcon, ROLE_LABEL } from "@/components/team/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchTeamTrainings } from "@/lib/api";
import type { PlayerPool, Training } from "@/lib/types";

const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

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

function TrainingCard({ training, teamSlug }: { training: Training; teamSlug: string }) {
  const { team1, team2 } = training;
  const mine = team1.slug === teamSlug ? team1 : team2;
  const other = mine === team1 ? team2 : team1;
  const result = mine.score === other.score ? null : mine.score > other.score ? "V" : "D";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {dateFormat.format(new Date(training.playedAt))}
          </p>
          {result && (
            <Badge variant={result === "V" ? "secondary" : "outline"}>
              {result === "V" ? "Vitória" : "Derrota"}
            </Badge>
          )}
        </div>
        <CardTitle className="flex flex-wrap items-center gap-x-3 gap-y-1 text-base">
          <span className="inline-flex items-center gap-2">
            <TeamLogo slug={team1.slug} name={team1.name} size={28} />
            {team1.name}
          </span>
          <span className="tabular-nums text-muted-foreground">
            {team1.score} – {team2.score}
          </span>
          <span className="inline-flex items-center gap-2">
            <TeamLogo slug={team2.slug} name={team2.name} size={28} />
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

export function TrainingsTab({ slug }: { slug: string }) {
  const { data, error, isPending, isFetching, refetch } = useQuery({
    queryKey: ["team-trainings", slug],
    queryFn: () => fetchTeamTrainings(slug),
  });

  if (isPending) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
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

  if (data.trainings.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Este time ainda não tem treinos registrados no cblow.xyz.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Campeões por jogador</h2>
        <Card>
          <CardContent>
            <ul className="divide-y divide-foreground/10">
              {data.pools.map((p) => (
                <PoolRow key={p.nick} pool={p} />
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Treinos ({data.trainings.length})</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {data.trainings.map((t) => (
            <TrainingCard key={t.id} training={t} teamSlug={slug} />
          ))}
        </div>
      </section>
    </div>
  );
}
