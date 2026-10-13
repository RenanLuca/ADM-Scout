"use client";

import { useQuery } from "@tanstack/react-query";
import { TeamLogo } from "@/components/TeamLogo";
import {
  ChampionIcon,
  LaneHeading,
  Metric,
  ROLE_LABEL,
  ResultBadge,
  percent,
  winrateTone,
} from "@/components/team/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { type Lineup } from "@/components/team/lineup";
import { fetchTeamTrainings } from "@/lib/api";
import { groupByLane, laneIndex } from "@/lib/lanes";
import type { PlayerPool, Training, TrainingPick } from "@/lib/types";
import { cn } from "@/lib/utils";

const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

// ---------------------------------------------------------------------------
// Resumo
// ---------------------------------------------------------------------------

function Summary({ trainings, slug }: { trainings: Training[]; slug: string }) {
  let wins = 0;
  let losses = 0;
  let games = 0;
  for (const t of trainings) {
    const mine = t.team1.slug === slug ? t.team1 : t.team2;
    const other = mine === t.team1 ? t.team2 : t.team1;
    if (mine.score > other.score) wins += 1;
    else if (mine.score < other.score) losses += 1;
    games += t.games.length;
  }

  return (
    <Card>
      <CardContent className="grid grid-cols-3 gap-4">
        <Metric label="Treinos" value={String(trainings.length)} size="lg" />
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Vitórias – derrotas
          </p>
          <p className="text-xl font-semibold tabular-nums leading-tight">
            <span className="text-emerald-400">{wins}</span>
            <span className="text-muted-foreground"> – </span>
            <span className="text-rose-400">{losses}</span>
          </p>
        </div>
        <Metric label="Jogos" value={String(games)} size="lg" />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Campeões por jogador
// ---------------------------------------------------------------------------

function ChampionTile({ c }: { c: PlayerPool["champions"][number] }) {
  const winrate = c.games ? c.wins / c.games : 0;

  return (
    <li className="space-y-3 rounded-xl bg-muted/40 p-3 ring-1 ring-foreground/5">
      <div className="flex items-center gap-3">
        <ChampionIcon champion={c} size={48} className="rounded-lg" />
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{c.name}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 border-t border-foreground/10 pt-2">
        <Metric label="Jogos" value={String(c.games)} />
        <Metric label="WR ≈" value={percent(winrate)} tone={winrateTone(winrate)} />
      </div>
    </li>
  );
}

function PlayerPoolCard({ pool }: { pool: PlayerPool }) {
  const winrate = pool.games ? pool.wins / pool.games : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate text-base">{pool.nick}</CardTitle>
            {pool.role && (
              <Badge variant="secondary" className="mt-1">
                {ROLE_LABEL[pool.role]}
              </Badge>
            )}
          </div>
          <div className="flex shrink-0 gap-4 text-right">
            <Metric label="Jogos" value={String(pool.games)} />
            <Metric label="WR ≈" value={percent(winrate)} tone={winrateTone(winrate)} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {pool.champions.map((c) => (
            <ChampionTile key={c.id} c={c} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Treinos
// ---------------------------------------------------------------------------

function PickRow({ pick, dimmed }: { pick: TrainingPick; dimmed?: boolean }) {
  return (
    <li className={cn("flex items-center gap-3", dimmed && "opacity-40")}>
      <ChampionIcon champion={pick.champion} size={36} className="rounded-lg" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{pick.champion.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {pick.nick}
          {pick.role && ` · ${ROLE_LABEL[pick.role]}`}
        </p>
      </div>
    </li>
  );
}

function TrainingCard({
  training,
  teamSlug,
  lineup,
}: {
  training: Training;
  teamSlug: string;
  lineup?: Lineup;
}) {
  const { team1, team2 } = training;
  const mine = team1.slug === teamSlug ? team1 : team2;
  const other = mine === team1 ? team2 : team1;
  const result = mine.score === other.score ? null : mine.score > other.score;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {dateFormat.format(new Date(training.playedAt))}
          </p>
          {result !== null && <ResultBadge won={result} />}
        </div>
        <div className="flex items-center justify-center gap-4 pt-1">
          <div className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center">
            <TeamLogo slug={team1.slug} name={team1.name} size={44} />
            <p className="truncate text-sm font-semibold">{team1.name}</p>
          </div>
          <p className="text-2xl font-bold tabular-nums">
            {team1.score}
            <span className="px-1 text-muted-foreground">–</span>
            {team2.score}
          </p>
          <div className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center">
            <TeamLogo slug={team2.slug} name={team2.name} size={44} />
            <p className="truncate text-sm font-semibold">{team2.name}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {training.games.map((game) => (
          <div
            key={game.n}
            className="space-y-4 rounded-xl bg-muted/30 p-3 ring-1 ring-foreground/5"
          >
            <p className="text-xs font-semibold">Jogo {game.n}</p>
            <div className="grid gap-5 sm:grid-cols-2">
              {[team1, team2].map((team) => (
                <div key={team.slug} className="space-y-3">
                  <p
                    className={cn(
                      "flex items-center gap-2 border-b-2 pb-2 text-sm font-semibold",
                      team.slug === teamSlug ? "border-foreground/40" : "border-foreground/10",
                    )}
                  >
                    <TeamLogo slug={team.slug} name={team.name} size={20} />
                    <span className="truncate">{team.name}</span>
                  </p>
                  <ul className="space-y-2">
                    {game.picks
                      .filter((p) => p.teamSlug === team.slug)
                      .sort((a, b) => laneIndex(a.role) - laneIndex(b.role))
                      .map((p) => (
                        <PickRow
                          key={`${p.nick}-${p.champion.id}`}
                          pick={p}
                          dimmed={Boolean(
                            lineup?.active && p.teamSlug === teamSlug && !lineup.nicks.has(p.nick),
                          )}
                        />
                      ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------

export function TrainingsTab({ slug, lineup }: { slug: string; lineup?: Lineup }) {
  const { data, error, isPending, isFetching, refetch } = useQuery({
    queryKey: ["team-trainings", slug],
    queryFn: () => fetchTeamTrainings(slug),
  });

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
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

  // Com escalação ativa, os campeões por jogador mostram só os titulares marcados.
  const pools = lineup?.active ? data.pools.filter((p) => lineup.nicks.has(p.nick)) : data.pools;

  return (
    <div className="space-y-10">
      <Summary trainings={data.trainings} slug={slug} />

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Campeões por jogador</h2>
          <p className="text-sm text-muted-foreground">
            WR estimado: o cblow.xyz só informa o placar da série, não quem ganhou cada jogo.
          </p>
        </div>
        {pools.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhum jogador da escalação participou de treinos.
          </p>
        )}
        <div className="space-y-6">
          {groupByLane(pools).map(({ role, items }) => (
            <div key={role ?? "none"} className="space-y-3">
              <LaneHeading role={role} count={items.length} />
              <div className="grid gap-4 xl:grid-cols-2">
                {items.map((p) => (
                  <PlayerPoolCard key={`${p.nick}-${p.role}`} pool={p} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Treinos</h2>
        <div className="grid gap-4 2xl:grid-cols-2">
          {data.trainings.map((t) => (
            <TrainingCard key={t.id} training={t} teamSlug={slug} lineup={lineup} />
          ))}
        </div>
      </section>
    </div>
  );
}
