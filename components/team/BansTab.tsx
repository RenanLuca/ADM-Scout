"use client";

import { useQuery } from "@tanstack/react-query";
import { ChampionIcon } from "@/components/team/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchTeamBans } from "@/lib/api";
import type { BanCandidate, BanTier } from "@/lib/types";
import { cn } from "@/lib/utils";

const TIER_STYLE: Record<BanTier, string> = {
  S: "bg-rose-500/15 text-rose-300 ring-rose-400/30",
  A: "bg-amber-500/15 text-amber-300 ring-amber-400/30",
  B: "bg-sky-500/15 text-sky-300 ring-sky-400/30",
};

function CandidateRow({ candidate }: { candidate: BanCandidate }) {
  const played = candidate.usage.length > 0;

  return (
    <li className={cn("flex items-start gap-3 py-3 first:pt-0 last:pb-0", !played && "opacity-50")}>
      <ChampionIcon champion={candidate} size={40} />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-medium">{candidate.name}</p>
        {played ? (
          <ul className="space-y-0.5 text-xs text-muted-foreground">
            {candidate.usage.map((u) => (
              <li key={u.player}>
                <span className="text-foreground">{u.player}</span>
                {u.seasonGames > 0 && <> · {u.seasonGames} jogos na temporada</>}
                {u.trainingGames > 0 && (
                  <>
                    {" "}
                    · {u.trainingGames} {u.trainingGames === 1 ? "treino" : "treinos"}
                  </>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">Sem registro neste time</p>
        )}
      </div>
    </li>
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
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Campeões da tier list dos mais roubados do campeonato, na ordem de prioridade. Dentro de
        cada tier, os mais usados por este time vêm primeiro (temporada ranqueada + treinos).
      </p>

      {data.unavailable.length > 0 && (
        <p className="text-sm text-amber-300">
          Sem estatísticas da temporada de: {data.unavailable.join(", ")}.
        </p>
      )}

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
                  <CandidateRow key={c.id} candidate={c} />
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
