"use client";

import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import { ROLE_LABEL } from "@/components/team/shared";
import { MAX_LINEUP, type Lineup } from "@/components/team/lineup";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { groupByLane } from "@/lib/lanes";
import type { Player } from "@/lib/types";
import { cn } from "@/lib/utils";

function PlayerToggle({
  player,
  selected,
  onToggle,
}: {
  player: Player;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        role="checkbox"
        aria-checked={selected}
        onClick={onToggle}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          selected
            ? "bg-emerald-500/10 ring-1 ring-emerald-400/40"
            : "ring-1 ring-foreground/10 hover:bg-muted/40",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded-md ring-1",
            selected ? "bg-emerald-500 text-background ring-emerald-400" : "ring-foreground/25",
          )}
        >
          {selected && <Check className="size-3.5" strokeWidth={3} />}
        </span>
        <span className="min-w-0 flex-1 truncate font-medium">{player.name}</span>
      </button>
    </li>
  );
}

/**
 * Painel de escalação: marque até 5 jogadores, organizados por lane, e todas as
 * abas passam a considerar só eles (histórico, campeonato, treinos e bans).
 */
export function LineupPanel({
  players,
  lineup,
  className,
}: {
  players: Player[];
  lineup: Lineup;
  className?: string;
}) {
  // No celular o painel começa recolhido; no desktop fica sempre aberto na lateral.
  const [openMobile, setOpenMobile] = useState(false);
  const count = lineup.slugs.length;
  const picked = players.filter((p) => lineup.isSelected(p.slug));
  const lanes = groupByLane(players);

  return (
    <aside
      aria-label="Escalação"
      className={cn("rounded-xl bg-card ring-1 ring-foreground/10", className)}
    >
      <button
        type="button"
        onClick={() => setOpenMobile((o) => !o)}
        aria-expanded={openMobile}
        className="flex w-full items-center gap-3 p-3 text-left lg:pointer-events-none"
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Escalação</p>
          <p className="truncate text-xs text-muted-foreground">
            {count === 0
              ? "Ninguém marcado: mostrando o elenco todo"
              : count === players.length
                ? "Elenco todo selecionado"
                : picked.map((p) => p.name).join(", ")}
          </p>
        </div>
        <Badge variant={count === MAX_LINEUP ? "secondary" : "outline"}>
          {count}/{MAX_LINEUP}
        </Badge>
        <ChevronDown
          aria-hidden
          className={cn(
            "size-5 shrink-0 text-muted-foreground transition-transform lg:hidden",
            openMobile && "rotate-180",
          )}
        />
      </button>

      <div
        className={cn(
          "space-y-4 border-t border-foreground/10 p-3",
          !openMobile && "hidden lg:block",
        )}
      >
        <p className="text-xs text-muted-foreground">
          Todos vêm marcados. Desmarque até ficar com os {MAX_LINEUP} do draft: histórico,
          campeonato, treinos e bans passam a considerar só os marcados.
        </p>

        <div className="space-y-3">
          {lanes.map(({ role, items }) => (
            <section key={role ?? "none"} aria-label={role ? ROLE_LABEL[role] : "Sem rota"}>
              <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {role ? ROLE_LABEL[role] : "Sem rota"}
              </h3>
              <ul role="group" className="space-y-1.5">
                {items.map((p) => {
                  const selected = lineup.isSelected(p.slug);
                  return (
                    <PlayerToggle
                      key={p.slug}
                      player={p}
                      selected={selected}
                      onToggle={() => lineup.toggle(p.slug)}
                    />
                  );
                })}
              </ul>
            </section>
          ))}
        </div>

        {lineup.overLimit && (
          <p className="text-xs text-amber-300">
            {count} marcados: uma partida tem {MAX_LINEUP}. Desmarque {count - MAX_LINEUP} para fechar
            a escalação.
          </p>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={lineup.selectAll}
            disabled={count === players.length}
          >
            Marcar todos
          </Button>
          <Button variant="ghost" size="sm" onClick={lineup.clear} disabled={count === 0}>
            Limpar
          </Button>
        </div>
      </div>
    </aside>
  );
}

/** Aviso fino acima do conteúdo das abas quando a escalação está filtrando os dados. */
export function LineupNotice({ players, lineup }: { players: Player[]; lineup: Lineup }) {
  if (!lineup.active) return null;
  const names = players.filter((p) => lineup.isSelected(p.slug)).map((p) => p.name);

  return (
    <p className="text-xs text-muted-foreground">
      Considerando só a escalação ({names.length}):{" "}
      <span className="text-foreground">{names.join(", ")}</span>
    </p>
  );
}
