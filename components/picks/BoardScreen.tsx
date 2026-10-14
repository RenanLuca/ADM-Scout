"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PicksGate } from "@/components/picks/PicksGate";
import { Workspace } from "@/components/picks/Workspace";
import { ROLE_LABEL } from "@/components/team/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LANE_ORDER } from "@/lib/lanes";
import { isLane, type ChampionOption, type PicksData } from "@/lib/picks";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";

function Screen({ data, champions }: { data: PicksData; champions: ChampionOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const wantedId = Number(params.get("jogador")) || null;
  const wantedLane = params.get("rota");

  const player = data.players.find((p) => p.id === wantedId) ?? data.players[0] ?? null;
  const lanes = player ? LANE_ORDER.filter((l) => player.lanes.includes(l)) : [];
  const lane: Role | undefined =
    isLane(wantedLane) && lanes.includes(wantedLane) ? wantedLane : lanes[0];

  /** A seleção vive na URL, então dá para compartilhar/voltar para o mesmo quadro. */
  function go(next: { jogador?: number; rota?: Role }) {
    const q = new URLSearchParams();
    q.set("jogador", String(next.jogador ?? player?.id ?? ""));
    if (next.rota) q.set("rota", next.rota);
    router.replace(`${pathname}?${q.toString()}`, { scroll: false });
  }

  if (data.players.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-lg font-semibold">Nenhum jogador cadastrado ainda</p>
          <p className="text-sm text-muted-foreground">
            Cadastre o elenco primeiro; depois volte aqui para montar o pool de campeões.
          </p>
          <Button render={<Link href="/nossos-picks/jogadores" />} nativeButton={false}>
            Ir para Jogadores
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!player || !lane) return null;

  return (
    <div className="space-y-5">
      {/* Quem */}
      <ScrollArea orientation="horizontal" className="w-full">
        {/* p-1: a borda (ring) dos chips fica fora da caixa e o ScrollArea recortaria sem essa folga */}
        <div className="flex w-max gap-2 p-1 pb-4" role="tablist" aria-label="Jogadores">
          {data.players.map((p) => {
            const selected = p.id === player.id;
            const count = data.entries.filter((e) => e.playerId === p.id).length;
            return (
              <button
                key={p.id}
                role="tab"
                aria-selected={selected}
                onClick={() => go({ jogador: p.id })}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-4 py-2.5 text-left ring-1 transition-colors",
                  selected
                    ? "bg-emerald-500/10 ring-emerald-400/50"
                    : "ring-foreground/10 hover:bg-muted/40",
                )}
              >
                <span className="text-sm font-semibold">{p.name}</span>
                <span className="rounded-md bg-foreground/10 px-1.5 text-xs tabular-nums">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </ScrollArea>

      {/* Qual rota */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted-foreground">Rota</span>
        <Tabs value={lane} onValueChange={(v) => go({ rota: v as Role })}>
          <TabsList>
            {lanes.map((l) => (
              <TabsTrigger key={l} value={l} className="px-4">
                {ROLE_LABEL[l]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <Workspace
        key={`${player.id}-${lane}`}
        data={data}
        player={player}
        lane={lane}
        champions={champions}
      />
    </div>
  );
}

export function BoardScreen() {
  return <PicksGate>{({ data, champions }) => <Screen data={data} champions={champions} />}</PicksGate>;
}
