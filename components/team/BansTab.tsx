"use client";

import { useQuery } from "@tanstack/react-query";
import { ChampionIcon } from "@/components/team/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchTeamBans } from "@/lib/api";
import type {
  BanChampion,
  BanRecommendation,
  BanThreat,
  BanTier,
  BanUsage,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const TIER_STYLE: Record<BanTier, string> = {
  S: "bg-rose-500/15 text-rose-300 ring-rose-400/30",
  A: "bg-amber-500/15 text-amber-300 ring-amber-400/30",
  B: "bg-sky-500/15 text-sky-300 ring-sky-400/30",
};

const THREAT: Record<BanThreat, { label: string; className: string }> = {
  alta: { label: "Ameaça alta", className: "bg-rose-500/15 text-rose-300 ring-rose-400/30" },
  media: { label: "Ameaça média", className: "bg-amber-500/15 text-amber-300 ring-amber-400/30" },
  baixa: { label: "Ameaça baixa", className: "bg-muted text-muted-foreground ring-foreground/10" },
};

const pct = (n: number) => `${Math.round(n * 100)}%`;
const gamesLabel = (n: number) => `${n} ${n === 1 ? "jogo" : "jogos"}`;

function PlayerLine({ p }: { p: BanRecommendation["players"][number] }) {
  return (
    <li className="flex flex-wrap items-baseline gap-x-1.5">
      <span className="text-foreground">{p.player}</span>
      <span>
        {gamesLabel(p.games)} · {pct(p.winrate)} WR
      </span>
      {p.trainingGames > 0 && (
        <span>
          ({p.trainingGames} {p.trainingGames === 1 ? "treino" : "treinos"})
        </span>
      )}
    </li>
  );
}

function TierBadge({ tier }: { tier: BanTier }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-semibold ring-1",
        TIER_STYLE[tier],
      )}
    >
      Tier {tier}
    </span>
  );
}

function PrimaryCard({ rec, rank }: { rec: BanRecommendation; rank: number }) {
  const threat = THREAT[rec.threat];

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="w-5 text-center text-lg font-bold tabular-nums text-muted-foreground">
            {rank}
          </span>
          <ChampionIcon champion={rec} size={48} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold">{rec.name}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span
                className={cn(
                  "inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ring-1",
                  threat.className,
                )}
              >
                {threat.label}
              </span>
              {rec.tier && <TierBadge tier={rec.tier} />}
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold tabular-nums leading-none">{rec.score}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">nota</p>
          </div>
        </div>
        <ul className="space-y-0.5 border-t border-foreground/10 pt-3 text-xs text-muted-foreground">
          {rec.players.map((p) => (
            <PlayerLine key={p.player} p={p} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function SecondaryRow({ rec, rank }: { rec: BanRecommendation; rank: number }) {
  const main = rec.players[0];

  return (
    <li className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
      <span className="w-6 text-center text-sm font-semibold tabular-nums text-muted-foreground">
        {rank}
      </span>
      <ChampionIcon champion={rec} size={36} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <p className="text-sm font-medium">{rec.name}</p>
          {rec.tier && <TierBadge tier={rec.tier} />}
        </div>
        {main && (
          <p className="truncate text-xs text-muted-foreground">
            {main.player} · {gamesLabel(main.games)} · {pct(main.winrate)} WR
            {rec.players.length > 1 && ` · +${rec.players.length - 1}`}
          </p>
        )}
      </div>
      <span className="text-sm font-semibold tabular-nums">{rec.score}</span>
    </li>
  );
}

function UsageLine({ u }: { u: BanUsage }) {
  const parts: string[] = [];
  if (u.seasonGames > 0) {
    parts.push(`${u.seasonGames} jogos na soloq (${pct(u.seasonWins / u.seasonGames)} WR)`);
  }
  if (u.trainingGames > 0) {
    parts.push(`${u.trainingGames} ${u.trainingGames === 1 ? "treino" : "treinos"}`);
  }

  return (
    <li>
      <span className="text-foreground">{u.player}</span>
      {parts.length > 0 && <> · {parts.join(" · ")}</>}
    </li>
  );
}

function TierListRow({ champion }: { champion: BanChampion }) {
  const played = champion.usage.length > 0;

  return (
    <li className={cn("flex items-start gap-3 py-3 first:pt-0 last:pb-0", !played && "opacity-50")}>
      <ChampionIcon champion={champion} size={36} />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-medium">{champion.name}</p>
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

export function BansTab({ slug }: { slug: string }) {
  const { data, error, isPending, isFetching, refetch } = useQuery({
    queryKey: ["team-bans", slug],
    queryFn: () => fetchTeamBans(slug),
  });

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
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

  const nothing = data.primary.length === 0;

  return (
    <div className="space-y-8">
      {data.unavailable.length > 0 && (
        <p className="text-sm text-amber-300">
          Sem estatísticas da temporada de: {data.unavailable.join(", ")}.
        </p>
      )}

      {nothing ? (
        <p className="text-sm text-muted-foreground">
          Ainda não há dados suficientes deste time para sugerir bans.
        </p>
      ) : (
        <>
          <section className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold">Banir primeiro</h2>
              <p className="text-sm text-muted-foreground">
                Os {data.primary.length} campeões mais perigosos nas mãos deste time.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data.primary.map((rec, i) => (
                <PrimaryCard key={rec.id} rec={rec} rank={i + 1} />
              ))}
            </div>
          </section>

          {data.secondary.length > 0 && (
            <section className="space-y-3">
              <div>
                <h2 className="text-lg font-semibold">Bans secundários</h2>
                <p className="text-sm text-muted-foreground">
                  Para quando os principais forem banidos pelo adversário ou escolhidos antes.
                </p>
              </div>
              <Card>
                <CardContent>
                  <ul className="divide-y divide-foreground/10">
                    {data.secondary.map((rec, i) => (
                      <SecondaryRow key={rec.id} rec={rec} rank={data.primary.length + i + 1} />
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </section>
          )}
        </>
      )}

      <details className="group rounded-xl ring-1 ring-foreground/10">
        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium">
          Ver tier list completa dos mais roubados
        </summary>
        <div className="grid gap-4 border-t border-foreground/10 p-4 lg:grid-cols-3">
          {data.tiers.map(({ tier, champions }) => (
            <Card key={tier}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TierBadge tier={tier} />
                  <Badge variant="outline" className="ml-auto">
                    {champions.filter((c) => c.usage.length > 0).length}/{champions.length} jogados
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-foreground/10">
                  {champions.map((c) => (
                    <TierListRow key={c.id} champion={c} />
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </details>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Como a nota é calculada: 70% é o domínio do melhor jogador do time no campeão (jogos da
        temporada ranqueada e dos treinos, com winrate suavizado para amostras pequenas) e 30% é a
        posição na tier list. Vitórias em treino são estimadas, pois o cblow.xyz só informa o
        placar da série.
      </p>
    </div>
  );
}
