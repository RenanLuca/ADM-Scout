"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  ChampionIcon,
  ROLE_LABEL,
  winrateTone,
} from "@/components/team/shared";
import { type Lineup } from "@/components/team/lineup";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchTeamDraft } from "@/lib/api";
import { groupByLane } from "@/lib/lanes";
import type { DraftPick, DraftTier, PlayerDraft, Role } from "@/lib/types";
import { cn } from "@/lib/utils";

const TIERS: { value: DraftTier; label: string; dot: string }[] = [
  {
    value: "best",
    label: "Melhores",
    dot: "bg-emerald-400",
  },
  {
    value: "good",
    label: "Bons",
    dot: "bg-sky-400",
  },
  {
    value: "medium",
    label: "Médios",
    dot: "bg-amber-400",
  },
];

const pct = (n: number) => `${Math.round(n * 100)}%`;

function PickCard({ pick }: { pick: DraftPick }) {
  const { usage: u } = pick;
  const detail = [
    u.seasonGames > 0 && `Soloq ${u.seasonGames}`,
    u.championshipGames > 0 && `Camp. ${u.championshipGames}`,
    u.trainingGames > 0 && `Treino ${u.trainingGames}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li
      title={detail}
      className="flex items-center gap-2 rounded-lg bg-muted/40 p-1.5 ring-1 ring-foreground/5"
    >
      <ChampionIcon champion={pick} size={32} className="rounded-md" />
      <div className="min-w-0">
        <p className="truncate text-xs font-medium leading-tight">{pick.name}</p>
        <p className="flex flex-wrap gap-x-1.5 text-[10px] leading-tight text-muted-foreground">
          <span className="whitespace-nowrap">
            {pick.games} {pick.games === 1 ? "jogo" : "jogos"}
          </span>
          {pick.competitiveWinrate !== null && (
            <span
              title="Winrate em treinos e jogos oficiais"
              className={cn(
                "whitespace-nowrap font-semibold",
                winrateTone(pick.competitiveWinrate),
              )}
            >
              {pct(pick.competitiveWinrate)} V
            </span>
          )}
        </p>
      </div>
    </li>
  );
}

function PlayerBlock({ player }: { player: PlayerDraft }) {
  const total = TIERS.reduce((s, t) => s + player.picks[t.value].length, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="truncate text-base font-semibold">{player.nick}</h3>
        <Badge variant="outline">
          {total} {total === 1 ? "campeão" : "campeões"}
        </Badge>
      </div>

      {total === 0 ? (
        <p className="text-sm text-muted-foreground">
          Sem partidas suficientes para sugerir picks.
        </p>
      ) : (
        TIERS.map((t) => {
          const picks = player.picks[t.value];
          if (picks.length === 0) return null;
          return (
            <section key={t.value} className="space-y-2">
              <h4 className="flex items-center gap-2 text-sm font-semibold">
                <span className={cn("size-2.5 rounded-full", t.dot)} />
                {t.label}
                <span className="text-xs font-normal text-muted-foreground">
                  {picks.length}
                </span>
              </h4>
              <ul className="grid grid-cols-2 gap-1.5">
                {picks.map((p) => (
                  <PickCard key={p.id} pick={p} />
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}

function LaneColumn({
  role,
  players,
}: {
  role: Role | null;
  players: PlayerDraft[];
}) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {role ? ROLE_LABEL[role] : "Sem rota"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 divide-y divide-foreground/10 [&>*:not(:first-child)]:pt-6">
        {players.map((p) => (
          <PlayerBlock key={p.slug} player={p} />
        ))}
      </CardContent>
    </Card>
  );
}

export function DraftTab({ slug, lineup }: { slug: string; lineup?: Lineup }) {
  const { data, error, isPending, isFetching, isPlaceholderData, refetch } =
    useQuery({
      // A escalação muda o cálculo no servidor, então entra na chave do cache.
      queryKey: ["team-draft", slug, lineup?.active ? lineup.slugs : []],
      queryFn: () => fetchTeamDraft(slug, lineup?.active ? lineup.slugs : []),
      placeholderData: keepPreviousData,
    });

  if (isPending) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
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
        <Button
          variant="outline"
          disabled={isFetching}
          onClick={() => refetch()}
        >
          {isFetching ? "Tentando…" : "Tentar de novo"}
        </Button>
      </div>
    );
  }

  return (
    <div
      className={`space-y-4 transition-opacity duration-200 ${isPlaceholderData ? "opacity-50" : ""}`}
      aria-busy={isPlaceholderData}
    >
      {data.unavailable.length > 0 && (
        <p className="text-sm text-amber-300">
          Sem estatísticas da temporada de: {data.unavailable.join(", ")}.
        </p>
      )}

      <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-[repeat(auto-fit,minmax(15rem,1fr))]">
        {groupByLane(data.players).map(({ role, items }) => (
          <LaneColumn key={role ?? "none"} role={role} players={items} />
        ))}
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Os picks de cada jogador vêm do domínio dele no campeão, somando soloq
        da temporada, treinos e campeonato. O winrate só conta treinos e jogos
        oficiais (vitórias de treino são estimadas). Melhores são os campeões
        que ele mais domina; bons e médios têm menos partidas ou resultado
        mais fraco. Só os 10 médios mais fortes aparecem.
      </p>
    </div>
  );
}
