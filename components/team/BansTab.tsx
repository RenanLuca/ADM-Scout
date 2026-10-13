"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import {
  ChampionIcon,
  LaneHeading,
  Metric,
  ROLE_LABEL,
  winrateTone,
} from "@/components/team/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { type Lineup } from "@/components/team/lineup";
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
const ratio = (wins: number, games: number) => (games > 0 ? wins / games : null);
const gamesLabel = (n: number) => `${n} ${n === 1 ? "jogo" : "jogos"}`;

// ---------------------------------------------------------------------------
// Peças pequenas
// ---------------------------------------------------------------------------

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

function OneTrickBadge({ player, share }: { player: string; share: number }) {
  return (
    <span
      title={`${player} concentra ${pct(share)} das partidas ranqueadas dele neste campeão`}
      className="inline-flex items-center rounded-md bg-violet-500/15 px-1.5 py-0.5 text-xs font-semibold text-violet-300 ring-1 ring-violet-400/30"
    >
      One trick · {pct(share)}
    </span>
  );
}

function Chip({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 rounded-md bg-muted/60 px-2 py-0.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-semibold tabular-nums", tone ?? "text-foreground")}>{value}</span>
    </span>
  );
}

/**
 * O que um jogador fez com o campeão. A soloq mostra só quantidade de jogos; o
 * WR (verde/vermelho) existe apenas para campeonato e treino.
 */
function UsageMetrics({ u }: { u: BanUsage }) {
  const official = ratio(u.championshipWins, u.championshipGames);
  const training = ratio(u.trainingWins, u.trainingGames);

  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2">
      {u.seasonGames > 0 && (
        <Metric
          label="Soloq"
          value={gamesLabel(u.seasonGames)}
          hint={u.seasonShare >= 0.15 ? `${pct(u.seasonShare)} das partidas dele` : undefined}
        />
      )}
      {official !== null && (
        <Metric
          label="Campeonato"
          value={gamesLabel(u.championshipGames)}
          hint={`${pct(official)} de vitória`}
          tone={winrateTone(official)}
        />
      )}
      {training !== null && (
        <Metric
          label="Treino"
          value={gamesLabel(u.trainingGames)}
          hint={`≈${pct(training)} de vitória`}
          tone={winrateTone(training)}
        />
      )}
    </div>
  );
}

function PlayerUsage({ u }: { u: BanUsage }) {
  return (
    <li className="space-y-1.5 py-3 first:pt-0 last:pb-0">
      <p className="text-sm font-semibold">{u.player}</p>
      <UsageMetrics u={u} />
    </li>
  );
}

// ---------------------------------------------------------------------------
// Linha recolhível de um campeão sugerido
// ---------------------------------------------------------------------------

function BanRow({
  rec,
  rank,
  open,
  onToggle,
}: {
  rec: BanRecommendation;
  rank: number;
  open: boolean;
  onToggle: () => void;
}) {
  const threat = THREAT[rec.threat];
  const main = rec.players[0];
  const official = main ? ratio(main.championshipWins, main.championshipGames) : null;
  const training = main ? ratio(main.trainingWins, main.trainingGames) : null;
  const others = rec.players.length - 1;
  const panelId = `ban-${rec.id}`;

  return (
    <li className="rounded-xl bg-card ring-1 ring-foreground/10">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="w-6 pt-2 text-center text-base font-bold tabular-nums text-muted-foreground">
          {rank}
        </span>
        <ChampionIcon champion={rec} size={52} className="rounded-lg" />

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-base font-semibold leading-tight">
              {rec.name}
            </p>
            {rec.tier && <TierBadge tier={rec.tier} />}
            {rec.oneTrick && <OneTrickBadge player={rec.oneTrick.player} share={rec.oneTrick.share} />}
            {rec.championship.games > 0 && (
              <span
                title="Partidas oficiais do campeonato com este campeão (time todo)"
                className={cn(
                  "inline-flex items-center rounded-md bg-muted/60 px-1.5 py-0.5 text-xs font-semibold",
                  winrateTone(rec.championship.wins / rec.championship.games),
                )}
              >
                Campeonato {rec.championship.wins}V {rec.championship.games - rec.championship.wins}D
              </span>
            )}
            <span
                className={cn(
                  "inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ring-1",
                  threat.className,
                )}
              >
                {threat.label}
              </span>
          </div>

          {main && (
            <div className="flex flex-wrap items-center gap-1.5">
              {main.role && (
                <span className="rounded bg-foreground/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                  {ROLE_LABEL[main.role]}
                </span>
              )}
              <span className="text-sm font-medium">{main.player}</span>
              {main.seasonGames > 0 && <Chip label="Soloq" value={`${main.seasonGames}`} />}
              {official !== null && (
                <Chip
                  label="Camp."
                  value={`${main.championshipGames} · ${pct(official)} V`}
                  tone={winrateTone(official)}
                />
              )}
              {training !== null && (
                <Chip
                  label="Treino"
                  value={`${main.trainingGames} · ≈${pct(training)} V`}
                  tone={winrateTone(training)}
                />
              )}
              {others > 0 && (
                <span className="text-xs text-muted-foreground">
                  +{others} {others === 1 ? "jogador" : "jogadores"}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-0.5">
          <div className="text-right">
            <p className="text-xl font-bold tabular-nums leading-none">
              {rec.score}
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">nota</p>
          </div>
          <ChevronDown
            aria-hidden
            className={cn(
              "size-5 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        </div>
      </button>

      {open && (
        <div id={panelId} className="space-y-4 border-t border-foreground/10 px-4 py-4">
          <ul className="divide-y divide-foreground/10">
            {rec.players.map((p) => (
              <PlayerUsage key={p.player} u={p} />
            ))}
          </ul>
          {rec.bannedAgainst > 0 && (
            <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              Banido <span className="font-semibold text-foreground">{rec.bannedAgainst}×</span>{" "}
              contra este time no campeonato
            </p>
          )}
        </div>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Tier list completa (também recolhível)
// ---------------------------------------------------------------------------

function TierListRow({ champion }: { champion: BanChampion }) {
  const [open, setOpen] = useState(false);
  const played = champion.usage.length > 0;
  const total = champion.usage.reduce((s, u) => s + u.seasonGames, 0);

  return (
    <li className={cn("rounded-lg ring-1 ring-foreground/10", !played && "opacity-50")}>
      <button
        type="button"
        disabled={!played}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-lg p-2 text-left enabled:hover:bg-muted/30"
      >
        <ChampionIcon champion={champion} size={36} className="rounded-lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{champion.name}</p>
          <p className="text-xs text-muted-foreground">
            {played
              ? `${champion.usage.length} ${champion.usage.length === 1 ? "jogador" : "jogadores"} · ${total} jogos na soloq`
              : "Sem registro neste time"}
          </p>
        </div>
        {played && (
          <ChevronDown
            aria-hidden
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        )}
      </button>
      {open && played && (
        <ul className="divide-y divide-foreground/10 border-t border-foreground/10 px-3 py-3">
          {champion.usage.map((u) => (
            <PlayerUsage key={u.player} u={u} />
          ))}
        </ul>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------

export function BansTab({ slug, lineup }: { slug: string; lineup?: Lineup }) {
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const [view, setView] = useState<"general" | "lane">("general");
  const { data, error, isPending, isFetching, refetch } = useQuery({
    // A escalação muda o cálculo no servidor, então entra na chave do cache.
    queryKey: ["team-bans", slug, lineup?.active ? lineup.slugs : []],
    queryFn: () => fetchTeamBans(slug, lineup?.active ? lineup.slugs : []),
  });

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
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

  const all =
    view === "lane"
      ? data.byLane.flatMap((g) => g.champions)
      : data.bans;
  const allOpen = all.length > 0 && all.every((r) => open.has(r.id));

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () => setOpen(allOpen ? new Set() : new Set(all.map((r) => r.id)));

  return (
    <div className="space-y-10">
      {data.unavailable.length > 0 && (
        <p className="text-sm text-amber-300">
          Sem estatísticas da temporada de: {data.unavailable.join(", ")}.
        </p>
      )}

      {data.bans.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Ainda não há dados suficientes deste time para sugerir bans.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div role="group" aria-label="Visão dos bans" className="flex gap-2">
              <Button
                size="sm"
                variant={view === "general" ? "default" : "outline"}
                aria-pressed={view === "general"}
                onClick={() => setView("general")}
              >
                Ranking geral
              </Button>
              <Button
                size="sm"
                variant={view === "lane" ? "default" : "outline"}
                aria-pressed={view === "lane"}
                onClick={() => setView("lane")}
              >
                Por lane
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={toggleAll}>
              {allOpen ? "Recolher tudo" : "Expandir tudo"}
            </Button>
          </div>

          {view === "lane" ? (
            <div className="space-y-8">
              <p className="text-sm text-muted-foreground">
                Os melhores bans de cada lane, pela lane de quem mais domina o campeão.
              </p>
              {data.byLane.map(({ role, champions }) => (
                <section key={role ?? "none"} className="space-y-3">
                  <LaneHeading role={role} count={champions.length} unit="campeão" />
                  <ul className="space-y-2">
                    {champions.map((rec, i) => (
                      <BanRow
                        key={rec.id}
                        rec={rec}
                        rank={i + 1}
                        open={open.has(rec.id)}
                        onToggle={() => toggle(rec.id)}
                      />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          ) : (
            <>
              <section className="space-y-3">
                <div>
                  <h2 className="text-lg font-semibold">Bans</h2>
                  <p className="text-sm text-muted-foreground">
                    {data.bans.length} campeões, do mais ao menos prioritário para este time.
                  </p>
                </div>
                <ul className="space-y-2">
                  {data.bans.map((rec, i) => (
                    <BanRow
                      key={rec.id}
                      rec={rec}
                      rank={i + 1}
                      open={open.has(rec.id)}
                      onToggle={() => toggle(rec.id)}
                    />
                  ))}
                </ul>
              </section>
            </>
          )}
        </>
      )}

      <details className="group rounded-xl ring-1 ring-foreground/10">
        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium">
          Ver tier list completa dos mais roubados
        </summary>
        <div className="grid items-start gap-4 border-t border-foreground/10 p-4 lg:grid-cols-3">
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
                <ul className="space-y-2">
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
        Como a nota é calculada: 40% é a tier list (S vale 40 pontos, A 26 e B 13), 25% é o que o
        time fez com o campeão em partidas oficiais (cada vitória pesa mais que cada derrota), 25%
        é o domínio do melhor jogador (jogos na soloq, treinos e campeonato) e 10% é o fator one
        trick. One tricks ainda têm nota mínima alta, mesmo fora da tier list. O winrate só conta
        em treinos e jogos oficiais; vitórias em treino são estimadas, pois o cblow.xyz só informa
        o placar da série.
      </p>
    </div>
  );
}
