"use client";

import { useQuery } from "@tanstack/react-query";
import { ChampionIcon } from "@/components/team/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchTeamBans } from "@/lib/api";
import type { BanChampion, BanTier, BanUsage } from "@/lib/types";
import { cn } from "@/lib/utils";

const TIER_STYLE: Record<BanTier, string> = {
  S: "bg-rose-500/15 text-rose-300 ring-rose-400/30",
  A: "bg-amber-500/15 text-amber-300 ring-amber-400/30",
  B: "bg-sky-500/15 text-sky-300 ring-sky-400/30",
};

const pct = (wins: number, games: number) => Math.round((wins / games) * 100);

function UsageLine({ u }: { u: BanUsage }) {
  const parts: string[] = [];
  if (u.seasonGames > 0) parts.push(`${u.seasonGames} jogos na soloq`);
  if (u.trainingGames > 0) {
    parts.push(
      `${u.trainingGames} ${u.trainingGames === 1 ? "treino" : "treinos"} (≈${pct(u.trainingWins, u.trainingGames)}% V)`,
    );
  }

  return (
    <li>
      <span className="text-foreground">{u.player}</span>
      {parts.length > 0 && <> · {parts.join(" · ")}</>}
    </li>
  );
}

function ChampionRow({ champion, summary }: { champion: BanChampion; summary?: string }) {
  const played = champion.usage.length > 0;

  return (
    <li className={cn("flex items-start gap-3 py-3 first:pt-0 last:pb-0", !played && "opacity-50")}>
      <ChampionIcon champion={champion} size={40} />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <p className="text-sm font-medium">{champion.name}</p>
          {summary && <p className="text-xs text-muted-foreground">{summary}</p>}
        </div>
        {played ? (
          <ul className="space-y-0.5 text-xs text-muted-foreground">
            {champion.usage.map((u) => (
              <UsageLine key={u.player} u={u} />
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">Sem registro neste time</p>
        )}
      </div>
    </li>
  );
}

function ExtraCard({
  title,
  description,
  champions,
  summary,
  empty,
}: {
  title: string;
  description: string;
  champions: BanChampion[];
  summary: (c: BanChampion) => string;
  empty: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        {champions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ul className="divide-y divide-foreground/10">
            {champions.map((c) => (
              <ChampionRow key={c.id} champion={c} summary={summary(c)} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function BansTab({ slug }: { slug: string }) {
  const { data, error, isPending, isFetching, refetch } = useQuery({
    queryKey: ["team-bans", slug],
    queryFn: () => fetchTeamBans(slug),
  });

  if (isPending) {
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-96 rounded-xl" />
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
    <div className="space-y-8">
      {data.unavailable.length > 0 && (
        <p className="text-sm text-amber-300">
          Sem estatísticas da temporada de: {data.unavailable.join(", ")}.
        </p>
      )}

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Tier list dos mais roubados</h2>
          <p className="text-sm text-muted-foreground">
            Na ordem de prioridade da tier list. Dentro de cada tier, os mais usados por este time
            (soloq + treinos) vêm primeiro.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {data.tiers.map(({ tier, champions }) => (
            <Card key={tier}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <span
                    className={cn(
                      "inline-flex size-7 items-center justify-center rounded-md text-sm font-bold ring-1",
                      TIER_STYLE[tier],
                    )}
                  >
                    {tier}
                  </span>
                  Tier {tier}
                  <Badge variant="outline" className="ml-auto">
                    {champions.filter((c) => c.usage.length > 0).length}/{champions.length} jogados
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-foreground/10">
                  {champions.map((c) => (
                    <ChampionRow key={c.id} champion={c} />
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Além da tier list</h2>
          <p className="text-sm text-muted-foreground">
            Campeões fora da tier list que este time usa bem. Os treinos só informam o placar da
            série, então as vitórias por campeão são estimadas.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <ExtraCard
            title="Vencem nos treinos"
            description={`Pelo menos 2 jogos em treino e ≥60% de vitória estimada.`}
            champions={data.trainingStandouts}
            summary={(c) =>
              `${c.trainingGames} jogos · ≈${pct(c.trainingWins, c.trainingGames)}% de vitória`
            }
            empty="Nenhum campeão com vitórias suficientes nos treinos."
          />
          <ExtraCard
            title="Muitos jogos na soloq"
            description="Algum jogador com 20+ jogos no campeão na temporada ranqueada."
            champions={data.soloqMostPlayed}
            summary={(c) => `${c.seasonGames} jogos na soloq`}
            empty="Nenhum campeão com volume relevante na soloq."
          />
        </div>
      </section>
    </div>
  );
}
