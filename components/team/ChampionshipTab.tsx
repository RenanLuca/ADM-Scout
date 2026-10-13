"use client";

import { useQuery } from "@tanstack/react-query";
import { TeamLogo } from "@/components/TeamLogo";
import {
  ChampionIcon,
  LaneHeading,
  Metric,
  ROLE_LABEL,
  ResultBadge,
  kdaTone,
  percent,
  winrateTone,
} from "@/components/team/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { type Lineup } from "@/components/team/lineup";
import { fetchTeamChampionship } from "@/lib/api";
import { groupByLane, laneIndex } from "@/lib/lanes";
import type {
  BanCount,
  ChampionshipGame,
  ChampionshipLine,
  ChampionshipMatch,
  ChampionRef,
  PlayerChampionshipPool,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

const minutes = (sec: number) => `${Math.round(sec / 60)} min`;
const gamesLabel = (n: number) => `${n} ${n === 1 ? "jogo" : "jogos"}`;

// ---------------------------------------------------------------------------
// Resumo do time
// ---------------------------------------------------------------------------

function Summary({
  matches,
  wins,
  losses,
  avgMin,
}: {
  matches: number;
  wins: number;
  losses: number;
  avgMin: number;
}) {
  return (
    <Card>
      <CardContent className="grid grid-cols-3 gap-4">
        <Metric label="Partidas" value={String(matches)} size="lg" />
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
        <Metric label="Duração média" value={`${avgMin} min`} size="lg" />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Campeões por jogador
// ---------------------------------------------------------------------------

function ChampionTile({ c }: { c: PlayerChampionshipPool["champions"][number] }) {
  const winrate = c.games ? c.wins / c.games : 0;

  return (
    <li className="space-y-3 rounded-xl bg-muted/40 p-3 ring-1 ring-foreground/5">
      <div className="flex items-center gap-3">
        <ChampionIcon champion={c} size={48} className="rounded-lg" />
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{c.name}</p>
      </div>
      <div className="grid grid-cols-3 gap-2 border-t border-foreground/10 pt-2">
        <Metric label="Jogos" value={String(c.games)} />
        <Metric label="WR" value={percent(winrate)} tone={winrateTone(winrate)} />
        <Metric label="KDA" value={c.kda.toFixed(1)} tone={kdaTone(c.kda)} />
      </div>
    </li>
  );
}

function PlayerPoolCard({ pool }: { pool: PlayerChampionshipPool }) {
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
            <Metric label="WR" value={percent(winrate)} tone={winrateTone(winrate)} />
            <Metric label="KDA" value={pool.kda.toFixed(2)} tone={kdaTone(pool.kda)} />
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
// Bans
// ---------------------------------------------------------------------------

function BanChips({ bans, empty }: { bans: BanCount[]; empty: string }) {
  if (bans.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;

  return (
    <ul className="flex flex-wrap gap-2">
      {bans.map((b) => (
        <li
          key={b.champion.id}
          className="flex items-center gap-2 rounded-xl bg-muted/40 p-1.5 pr-3 text-sm ring-1 ring-foreground/5"
        >
          <ChampionIcon champion={b.champion} size={36} className="rounded-lg" />
          <span className="font-medium">{b.champion.name}</span>
          {b.count > 1 && (
            <span className="rounded-md bg-rose-500/15 px-1.5 text-xs font-semibold tabular-nums text-rose-300">
              ×{b.count}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

function IconRow({ champions }: { champions: ChampionRef[] }) {
  if (champions.length === 0) {
    return <span className="text-xs text-muted-foreground">não registrados</span>;
  }
  return (
    <span className="flex flex-wrap gap-1">
      {champions.map((c) => (
        <ChampionIcon key={c.id} champion={c} size={24} />
      ))}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Partidas
// ---------------------------------------------------------------------------

function LineRow({ line, dimmed }: { line: ChampionshipLine; dimmed?: boolean }) {
  const kda = (line.kills + line.assists) / Math.max(line.deaths, 1);

  return (
    <li className={cn("flex items-center gap-3", dimmed && "opacity-40")}>
      <ChampionIcon champion={line.champion} size={36} className="rounded-lg" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{line.champion.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {line.nick}
          {line.role && ` · ${ROLE_LABEL[line.role]}`}
        </p>
      </div>
      <div className="text-right tabular-nums">
        <p className="text-sm">
          <span className="font-semibold">{line.kills}</span>
          <span className="text-muted-foreground">/</span>
          <span className="font-semibold text-rose-400">{line.deaths}</span>
          <span className="text-muted-foreground">/</span>
          <span className="font-semibold">{line.assists}</span>
        </p>
        <p className={cn("text-xs font-medium", kdaTone(kda))}>{kda.toFixed(1)} KDA</p>
      </div>
    </li>
  );
}

function GameBlock({
  match,
  game,
  teamSlug,
  lineup,
}: {
  match: ChampionshipMatch;
  game: ChampionshipGame;
  teamSlug: string;
  lineup?: Lineup;
}) {
  const sides = [match.team1, match.team2];

  return (
    <div className="space-y-4 rounded-xl bg-muted/30 p-3 ring-1 ring-foreground/5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">Jogo {game.number}</span>
        <span>{minutes(game.durationSec)}</span>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {sides.map((team) => {
          const card = game.cards[team.slug];
          const isWinner = game.winnerSlug === team.slug;
          return (
            <div key={team.slug} className="space-y-3">
              <div
                className={cn(
                  "flex items-center gap-2 border-b-2 pb-2",
                  isWinner ? "border-emerald-400/70" : "border-foreground/10",
                )}
              >
                <TeamLogo slug={team.slug} name={team.name} size={24} />
                <p className="min-w-0 flex-1 truncate text-sm font-semibold">{team.name}</p>
                {isWinner && <ResultBadge won />}
              </div>

              <ul className="space-y-2">
                {game.lines
                  .filter((l) => l.teamSlug === team.slug)
                  .sort((a, b) => laneIndex(a.role) - laneIndex(b.role))
                  .map((l) => (
                    <LineRow
                      key={`${l.slug}-${l.champion.id}`}
                      line={l}
                      dimmed={Boolean(
                        lineup?.active && l.teamSlug === teamSlug && !lineup.isSelected(l.slug),
                      )}
                    />
                  ))}
              </ul>

              <div className="space-y-1.5 border-t border-foreground/10 pt-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="w-10 shrink-0">Bans</span>
                  <IconRow champions={game.bans[team.slug] ?? []} />
                </div>
                {card && (
                  <div className="flex items-center gap-2">
                    <span className="w-10 shrink-0">Carta</span>
                    <span className="text-foreground">{card.name}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <span className="sr-only">
        {game.winnerSlug === teamSlug ? "Vitória do time" : "Derrota do time"}
      </span>
    </div>
  );
}

function MatchCard({
  match,
  teamSlug,
  lineup,
}: {
  match: ChampionshipMatch;
  teamSlug: string;
  lineup?: Lineup;
}) {
  const mine = match.team1.slug === teamSlug ? match.team1 : match.team2;
  const other = mine === match.team1 ? match.team2 : match.team1;
  const result = mine.score === other.score ? null : mine.score > other.score;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {match.stage} · {dateFormat.format(new Date(match.scheduledAt))}
          </p>
          {result !== null && <ResultBadge won={result} />}
        </div>
        <div className="flex items-center justify-center gap-4 pt-1">
          <div className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center">
            <TeamLogo slug={match.team1.slug} name={match.team1.name} size={44} />
            <p className="truncate text-sm font-semibold">{match.team1.name}</p>
          </div>
          <p className="text-2xl font-bold tabular-nums">
            {match.team1.score}
            <span className="px-1 text-muted-foreground">–</span>
            {match.team2.score}
          </p>
          <div className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center">
            <TeamLogo slug={match.team2.slug} name={match.team2.name} size={44} />
            <p className="truncate text-sm font-semibold">{match.team2.name}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {match.games.map((g) => (
          <GameBlock key={g.number} match={match} game={g} teamSlug={teamSlug} lineup={lineup} />
        ))}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------

export function ChampionshipTab({ slug, lineup }: { slug: string; lineup?: Lineup }) {
  const { data, error, isPending, isFetching, refetch } = useQuery({
    queryKey: ["team-championship", slug],
    queryFn: () => fetchTeamChampionship(slug),
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

  const { record, matches, bannedByTeam, bannedAgainst } = data;
  // Com escalação ativa, os campeões por jogador mostram só os titulares marcados.
  const pools = lineup?.active
    ? data.pools.filter((p) => lineup.isSelected(p.slug))
    : data.pools;

  if (matches.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Este time ainda não tem partidas finalizadas no campeonato.
      </p>
    );
  }

  const gamesTotal = matches.reduce((s, m) => s + m.games.length, 0);
  const gamesWithBans = matches.reduce(
    (s, m) => s + m.games.filter((g) => Object.values(g.bans).some((b) => b.length > 0)).length,
    0,
  );

  return (
    <div className="space-y-10">
      <Summary
        matches={record.matches}
        wins={record.wins}
        losses={record.losses}
        avgMin={record.avgDurationMin}
      />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Campeões por jogador</h2>
        {pools.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhum jogador da escalação jogou partidas do campeonato ainda.
          </p>
        )}
        <div className="space-y-6">
          {groupByLane(pools).map(({ role, items }) => (
            <div key={role ?? "none"} className="space-y-3">
              <LaneHeading role={role} count={items.length} />
              <div className="grid gap-4 xl:grid-cols-2">
                {items.map((p) => (
                  <PlayerPoolCard key={`${p.slug}-${p.role}`} pool={p} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Bans</h2>
          {gamesWithBans < gamesTotal && (
            <p className="text-sm text-muted-foreground">
              Registrados em {gamesWithBans} de {gamesLabel(gamesTotal)}.
            </p>
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bans do time</CardTitle>
            </CardHeader>
            <CardContent>
              <BanChips bans={bannedByTeam} empty="Nenhum ban registrado." />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Banidos contra o time</CardTitle>
            </CardHeader>
            <CardContent>
              <BanChips bans={bannedAgainst} empty="Nenhum ban registrado." />
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Partidas</h2>
        <div className="grid gap-4 2xl:grid-cols-2">
          {matches.map((m) => (
            <MatchCard key={m.id} match={m} teamSlug={slug} lineup={lineup} />
          ))}
        </div>
      </section>
    </div>
  );
}
