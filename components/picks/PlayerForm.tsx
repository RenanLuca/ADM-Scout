"use client";

import { useState } from "react";
import { ROLE_LABEL } from "@/components/team/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PlayerInput } from "@/lib/api";
import { LANE_ORDER } from "@/lib/lanes";
import type { PickPlayer } from "@/lib/picks";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Criar ou editar um jogador: nome e rotas que joga. */
export function PlayerForm({
  initial,
  busy,
  error,
  onSubmit,
  onCancel,
}: {
  initial?: PickPlayer;
  busy: boolean;
  error: string | null;
  onSubmit: (input: PlayerInput) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [lanes, setLanes] = useState<Role[]>(initial?.lanes ?? []);

  const toggleLane = (lane: Role) =>
    setLanes((cur) => (cur.includes(lane) ? cur.filter((l) => l !== lane) : [...cur, lane]));

  const canSubmit = name.trim().length > 0 && lanes.length > 0 && !busy;

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) onSubmit({ name, lanes });
      }}
    >
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Nome do jogador</span>
        <Input
          autoFocus
          placeholder="Ex.: Kennzy"
          maxLength={40}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-10"
        />
      </label>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Rotas que joga</legend>
        <div className="flex flex-wrap gap-2">
          {LANE_ORDER.map((lane) => {
            const on = lanes.includes(lane);
            return (
              <button
                key={lane}
                type="button"
                aria-pressed={on}
                onClick={() => toggleLane(lane)}
                className={cn(
                  "rounded-lg px-3.5 py-2 text-sm font-semibold ring-1 transition-colors",
                  on
                    ? "bg-emerald-500/15 text-emerald-300 ring-emerald-400/50"
                    : "text-muted-foreground ring-foreground/15 hover:bg-muted/50",
                )}
              >
                {ROLE_LABEL[lane]}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Cada rota marcada ganha o próprio quadro de campeões.
        </p>
      </fieldset>

      {error && (
        <p role="alert" className="text-sm text-rose-400">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!canSubmit}>
          {busy ? "Salvando…" : initial ? "Salvar" : "Adicionar jogador"}
        </Button>
      </div>
    </form>
  );
}
