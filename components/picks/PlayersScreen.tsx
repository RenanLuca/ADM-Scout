"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LayoutGrid, Pencil, Plus, Trash2, UserRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmProvider";
import { PicksGate } from "@/components/picks/PicksGate";
import { PlayerForm } from "@/components/picks/PlayerForm";
import { ROLE_LABEL } from "@/components/team/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ApiError,
  createPlayer,
  deletePlayer,
  updatePlayer,
  type PlayerInput,
} from "@/lib/api";
import { LANE_ORDER } from "@/lib/lanes";
import type { PickPlayer, PicksData } from "@/lib/picks";

const message = (e: unknown) =>
  e instanceof ApiError ? e.message : "Não foi possível salvar. Tente de novo.";

type Editing = { kind: "create" } | { kind: "edit"; player: PickPlayer } | null;

function PlayerCard({
  player,
  data,
  onEdit,
  onDelete,
}: {
  player: PickPlayer;
  data: PicksData;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const lanes = LANE_ORDER.filter((l) => player.lanes.includes(l));

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-foreground/10">
            <UserRound className="size-5 text-muted-foreground" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold leading-tight">{player.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {lanes.length} {lanes.length === 1 ? "rota" : "rotas"}
            </p>
          </div>
        </div>

        <ul className="space-y-1.5">
          {lanes.map((lane) => {
            const count = data.entries.filter(
              (e) => e.playerId === player.id && e.lane === lane,
            ).length;
            return (
              <li key={lane}>
                <Link
                  href={`/nossos-picks/quadro?jogador=${player.id}&rota=${lane}`}
                  className="flex items-center justify-between rounded-lg px-3 py-2 ring-1 ring-foreground/10 transition-colors hover:bg-muted/40"
                >
                  <span className="text-sm font-semibold">{ROLE_LABEL[lane]}</span>
                  <span className="text-xs text-muted-foreground">
                    {count === 0
                      ? "sem campeões"
                      : `${count} ${count === 1 ? "campeão" : "campeões"}`}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-wrap gap-1.5 border-t border-foreground/10 pt-3">
          <Button
            size="sm"
            variant="secondary"
            render={<Link href={`/nossos-picks/quadro?jogador=${player.id}`} />}
            nativeButton={false}
          >
            <LayoutGrid className="size-4" /> Abrir quadro
          </Button>
          <Button size="sm" variant="ghost" onClick={onEdit}>
            <Pencil className="size-4" /> Editar
          </Button>
          <Button size="sm" variant="ghost" onClick={onDelete} className="ml-auto">
            <Trash2 className="size-4" /> Apagar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Screen({ data }: { data: PicksData }) {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [editing, setEditing] = useState<Editing>(null);
  const [error, setError] = useState<string | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["picks"] });

  const close = () => {
    setEditing(null);
    setError(null);
  };

  const create = useMutation({
    mutationFn: (input: PlayerInput) => createPlayer(input),
    onSuccess: (_data, input) => {
      close();
      toast.success(`${input.name} adicionado ao elenco`);
      void refresh();
    },
    onError: (e) => setError(message(e)),
  });
  const edit = useMutation({
    mutationFn: ({ id, input }: { id: number; input: PlayerInput }) => updatePlayer(id, input),
    onSuccess: (_data, { input }) => {
      close();
      toast.success(`${input.name} atualizado`);
      void refresh();
    },
    onError: (e) => setError(message(e)),
  });
  // Apagar some da tela na hora; se o servidor recusar, volta e avisa.
  const remove = useMutation({
    mutationFn: ({ id }: { id: number; name: string }) => deletePlayer(id),
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: ["picks"] });
      const previous = qc.getQueryData<PicksData>(["picks"]);
      if (previous) {
        qc.setQueryData<PicksData>(["picks"], {
          ...previous,
          players: previous.players.filter((p) => p.id !== id),
          entries: previous.entries.filter((e) => e.playerId !== id),
        });
      }
      return { previous };
    },
    onSuccess: (_data, { name }) => toast.success(`${name} apagado`),
    onError: (e, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(["picks"], ctx.previous);
      toast.error(message(e));
    },
    onSettled: () => void refresh(),
  });

  const totalChampions = data.entries.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            {data.players.length} {data.players.length === 1 ? "jogador" : "jogadores"}
          </Badge>
          <Badge variant="outline">
            {totalChampions} {totalChampions === 1 ? "campeão marcado" : "campeões marcados"}
          </Badge>
          <Badge variant="outline">
            {data.categories.length}{" "}
            {data.categories.length === 1 ? "categoria" : "categorias"}
          </Badge>
        </div>
        <Button onClick={() => setEditing({ kind: "create" })}>
          <Plus className="size-4" /> Novo jogador
        </Button>
      </div>

      {data.players.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <UserRound className="size-10 text-muted-foreground" />
            <div>
              <p className="text-lg font-semibold">Comece cadastrando o elenco</p>
              <p className="text-sm text-muted-foreground">
                Adicione cada jogador com as rotas que ele joga. Depois, no quadro, você monta o
                pool de campeões de cada um.
              </p>
            </div>
            <Button onClick={() => setEditing({ kind: "create" })}>
              <Plus className="size-4" /> Adicionar o primeiro jogador
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {data.players.map((p) => (
            <PlayerCard
              key={p.id}
              player={p}
              data={data}
              onEdit={() => setEditing({ kind: "edit", player: p })}
              onDelete={async () => {
                const ok = await confirm({
                  title: `Apagar ${p.name}?`,
                  description:
                    "Todos os campeões marcados para ele, em todas as rotas, serão removidos. Isso não pode ser desfeito.",
                  confirmLabel: "Apagar jogador",
                  destructive: true,
                });
                if (ok) remove.mutate({ id: p.id, name: p.name });
              }}
            />
          ))}
        </div>
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => !open && close()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing?.kind === "edit" ? `Editar ${editing.player.name}` : "Novo jogador"}
            </DialogTitle>
            <DialogDescription>
              Nome e as rotas que joga.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <PlayerForm
              key={editing.kind === "edit" ? editing.player.id : "new"}
              initial={editing.kind === "edit" ? editing.player : undefined}
              busy={create.isPending || edit.isPending}
              error={error}
              onCancel={close}
              onSubmit={async (input) => {
                if (editing.kind === "create") {
                  create.mutate(input);
                  return;
                }
                const dropped = editing.player.lanes.filter((l) => !input.lanes.includes(l));
                if (dropped.length > 0) {
                  const ok = await confirm({
                    title: "Tirar rota apaga campeões",
                    description: `Tirar ${dropped.map((l) => ROLE_LABEL[l]).join(", ")} remove os campeões marcados nessa rota. Continuar?`,
                    confirmLabel: "Tirar rota",
                    destructive: true,
                  });
                  if (!ok) return;
                }
                edit.mutate({ id: editing.player.id, input });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function PlayersScreen() {
  return <PicksGate>{({ data }) => <Screen data={data} />}</PicksGate>;
}
