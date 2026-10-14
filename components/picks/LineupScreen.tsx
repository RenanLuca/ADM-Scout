"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { COLOR_STYLES } from "@/components/picks/colors";
import { PicksGate } from "@/components/picks/PicksGate";
import { ChampionIcon, ROLE_LABEL } from "@/components/team/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LANE_ORDER } from "@/lib/lanes";
import type { PickPlayer, PicksData } from "@/lib/picks";
import type { ChampionRef, Role } from "@/lib/types";
import { cn } from "@/lib/utils";

const NONE = "none";
const STORAGE_KEY = "adm-scout:nossos-picks:escalacao";

type Slots = Partial<Record<Role, number>>;

function readSlots(): Slots {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== "object") return {};
    const out: Slots = {};
    for (const lane of LANE_ORDER) {
      const v = (parsed as Record<string, unknown>)[lane];
      if (typeof v === "number") out[lane] = v;
    }
    return out;
  } catch {
    return {}; // storage bloqueado ou JSON inválido
  }
}

function writeSlots(slots: Slots) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slots));
  } catch {
    // sem persistência: a escalação continua valendo na sessão
  }
}

function LaneColumn({
  lane,
  candidates,
  player,
  data,
  championsById,
  onPick,
}: {
  lane: Role;
  candidates: PickPlayer[];
  player: PickPlayer | null;
  data: PicksData;
  championsById: Map<string, ChampionRef>;
  onPick: (playerId: number | null) => void;
}) {
  const items = [
    { value: NONE, label: "— escolher jogador —" },
    ...candidates.map((p) => ({ value: String(p.id), label: p.name })),
  ];

  const sections = player
    ? data.categories.map((c) => ({
        category: c,
        entries: data.entries
          .filter((e) => e.playerId === player.id && e.lane === lane && e.categoryId === c.id)
          .sort((a, b) => a.position - b.position),
      }))
    : [];
  const total = sections.reduce((s, x) => s + x.entries.length, 0);

  return (
    <Card className="min-w-0">
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {ROLE_LABEL[lane]}
          </CardTitle>
          {player && (
            <Badge variant="outline">
              {total} {total === 1 ? "campeão" : "campeões"}
            </Badge>
          )}
        </div>
        <Select
          items={items}
          value={player ? String(player.id) : NONE}
          onValueChange={(v) => onPick(v === NONE ? null : Number(v))}
        >
          <SelectTrigger className="h-10 w-full text-base font-semibold">
            <SelectValue placeholder="— escolher jogador —" />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            {items.map((i) => (
              <SelectItem key={i.value} value={i.value}>
                {i.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {candidates.length === 0 && (
          <p className="text-xs text-muted-foreground">Ninguém cadastrado joga de {ROLE_LABEL[lane]}.</p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {!player ? (
          <p className="text-sm text-muted-foreground">Escolha quem joga de {ROLE_LABEL[lane]}.</p>
        ) : data.categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma categoria criada ainda.</p>
        ) : total === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sem campeões marcados para {player.name} de {ROLE_LABEL[lane]}.{" "}
            <Link
              className="underline"
              href={`/nossos-picks/quadro?jogador=${player.id}&rota=${lane}`}
            >
              Abrir quadro
            </Link>
          </p>
        ) : (
          sections.map(({ category, entries }) => (
            <section key={category.id} className="space-y-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <span className={cn("size-2.5 rounded-full", COLOR_STYLES[category.color].dot)} />
                {category.name}
                <span className="text-xs font-normal text-muted-foreground">{entries.length}</span>
              </h3>
              {entries.length === 0 ? (
                <p className="pl-4 text-xs text-muted-foreground">—</p>
              ) : (
                <ul className="grid grid-cols-2 gap-1.5">
                  {entries.map((e) => {
                    const champion = championsById.get(e.championId);
                    return (
                      <li
                        key={e.championId}
                        className="flex items-center gap-2 rounded-lg bg-muted/40 p-1.5 ring-1 ring-foreground/5"
                      >
                        {champion && (
                          <ChampionIcon champion={champion} size={32} className="rounded-md" />
                        )}
                        <span className="truncate text-xs font-medium">
                          {champion?.name ?? e.championId}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function Screen({ data, champions }: { data: PicksData; champions: ChampionRef[] }) {
  const [slots, setSlots] = useState<Slots>(() =>
    typeof window === "undefined" ? {} : readSlots(),
  );
  const championsById = useMemo(() => new Map(champions.map((c) => [c.id, c])), [champions]);
  const playersById = useMemo(() => new Map(data.players.map((p) => [p.id, p])), [data.players]);

  // Só vale jogador que ainda existe e continua jogando aquela rota.
  const lineup = useMemo(() => {
    const out: Partial<Record<Role, PickPlayer>> = {};
    for (const lane of LANE_ORDER) {
      const p = slots[lane] !== undefined ? playersById.get(slots[lane]!) : undefined;
      if (p && p.lanes.includes(lane)) out[lane] = p;
    }
    return out;
  }, [slots, playersById]);

  const filled = LANE_ORDER.filter((l) => lineup[l]).length;

  function pick(lane: Role, playerId: number | null) {
    const next = { ...slots };
    if (playerId === null) delete next[lane];
    else next[lane] = playerId;
    setSlots(next);
    writeSlots(next);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant={filled === 5 ? "secondary" : "outline"}>{filled}/5 posições</Badge>
          <p className="text-sm text-muted-foreground">
            Escolha quem joga em cada posição para ver os picks do time lado a lado.
          </p>
        </div>
        {filled > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSlots({});
              writeSlots({});
            }}
          >
            Limpar escalação
          </Button>
        )}
      </div>

      {data.players.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-lg font-semibold">Nenhum jogador cadastrado ainda</p>
            <Button render={<Link href="/nossos-picks/jogadores" />} nativeButton={false}>
              Ir para Jogadores
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-5">
          {LANE_ORDER.map((lane) => (
            <LaneColumn
              key={lane}
              lane={lane}
              candidates={data.players.filter((p) => p.lanes.includes(lane))}
              player={lineup[lane] ?? null}
              data={data}
              championsById={championsById}
              onPick={(id) => pick(lane, id)}
            />
          ))}
        </div>
      )}

    </div>
  );
}

export function LineupScreen() {
  return <PicksGate>{({ data, champions }) => <Screen data={data} champions={champions} />}</PicksGate>;
}
