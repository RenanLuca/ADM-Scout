"use client";

import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, GripVertical, MoreVertical, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmProvider";
import { COLOR_STYLES } from "@/components/picks/colors";
import {
  applyMove,
  applyRemove,
  boardEntries,
  type EntryKey,
  type MoveVars,
} from "@/components/picks/entries";
import { ChampionIcon, ROLE_LABEL } from "@/components/team/shared";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ApiError,
  createCategory,
  deleteCategory,
  deleteEntry,
  putEntry,
  reorderCategories,
  updateCategory,
} from "@/lib/api";
import { LANE_ORDER } from "@/lib/lanes";
import {
  CATEGORY_COLORS,
  type CategoryColor,
  type ChampionOption,
  type PickCategory,
  type PickEntry,
  type PickPlayer,
  type PicksData,
} from "@/lib/picks";
import type { ChampionRef, Role } from "@/lib/types";
import { cn } from "@/lib/utils";

type DragData =
  | { type: "palette"; championId: string }
  | { type: "card"; championId: string; categoryId: number };

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const errorMessage = (e: unknown) =>
  e instanceof ApiError ? e.message : "Não foi possível salvar. Tente de novo.";

// ---------------------------------------------------------------------------
// Peças de arrastar e soltar
// ---------------------------------------------------------------------------

function BoardCard({
  entry,
  champion,
  categories,
  onMove,
  onRemove,
}: {
  entry: PickEntry;
  champion: ChampionRef;
  categories: PickCategory[];
  onMove: (categoryId: number) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `card:${entry.championId}`,
    data: { type: "card", championId: entry.championId, categoryId: entry.categoryId } satisfies DragData,
  });
  const others = categories.filter((c) => c.id !== entry.categoryId);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex animate-in items-center gap-1 rounded-xl bg-card p-1.5 ring-1 ring-foreground/10 duration-200 fade-in-0 zoom-in-95",
        isDragging && "opacity-40",
      )}
    >
      <button
        type="button"
        aria-label={`Arrastar ${champion.name}`}
        className="flex min-w-0 flex-1 cursor-grab touch-none items-center gap-2.5 rounded-lg text-left active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4 shrink-0 text-muted-foreground/60" />
        <ChampionIcon champion={champion} size={44} className="rounded-lg" />
        <span className="truncate text-sm font-semibold">{champion.name}</span>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Ações de ${champion.name}`}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <MoreVertical className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          {others.length > 0 && (
            <DropdownMenuGroup>
              <DropdownMenuLabel>Mover para</DropdownMenuLabel>
              {others.map((c) => (
                <DropdownMenuItem key={c.id} onClick={() => onMove(c.id)}>
                  <span className={cn("size-2.5 rounded-full", COLOR_STYLES[c.color].dot)} />
                  {c.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </DropdownMenuGroup>
          )}
          <DropdownMenuItem variant="destructive" onClick={onRemove}>
            <Trash2 className="size-4" /> Remover do quadro
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

function PaletteTile({
  champion,
  placedIn,
  armed,
  onArm,
}: {
  champion: ChampionRef;
  placedIn: PickCategory | null;
  armed: boolean;
  onArm: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `pal:${champion.id}`,
    data: { type: "palette", championId: champion.id } satisfies DragData,
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      onClick={onArm}
      aria-pressed={armed}
      title={placedIn ? `${champion.name} — em ${placedIn.name}` : champion.name}
      className={cn(
        "relative flex cursor-grab touch-none flex-col items-center gap-1 rounded-xl p-2 text-center ring-1 transition-colors active:cursor-grabbing",
        armed ? "bg-emerald-500/15 ring-emerald-400/60" : "ring-foreground/10 hover:bg-muted/50",
        isDragging && "opacity-40",
      )}
    >
      <ChampionIcon champion={champion} size={48} className="rounded-lg" />
      <span className="line-clamp-1 w-full text-xs font-medium leading-tight">{champion.name}</span>
      {placedIn && (
        <span
          aria-hidden
          className={cn(
            "absolute right-1.5 top-1.5 size-3 rounded-full ring-2 ring-card",
            COLOR_STYLES[placedIn.color].dot,
          )}
        />
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Coluna (categoria)
// ---------------------------------------------------------------------------

function Column({
  category,
  entries,
  championsById,
  categories,
  index,
  total,
  armedChampion,
  dragging,
  onPlaceArmed,
  onRename,
  onRecolor,
  onShift,
  onDelete,
  onMoveCard,
  onRemoveCard,
}: {
  category: PickCategory;
  entries: PickEntry[];
  championsById: Map<string, ChampionRef>;
  categories: PickCategory[];
  index: number;
  total: number;
  armedChampion: ChampionRef | null;
  /** Há um arrasto em andamento: as colunas mostram onde dá para soltar. */
  dragging: boolean;
  onPlaceArmed: () => void;
  onRename: (name: string) => void;
  onRecolor: (color: CategoryColor) => void;
  onShift: (direction: -1 | 1) => void;
  onDelete: () => void;
  onMoveCard: (championId: string, categoryId: number) => void;
  onRemoveCard: (championId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${category.id}` });
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const style = COLOR_STYLES[category.color];

  function commitName() {
    setEditing(false);
    const trimmed = name.trim();
    if (trimmed && trimmed !== category.name) onRename(trimmed);
    else setName(category.name);
  }

  return (
    <section
      aria-label={`Categoria ${category.name}`}
      className={cn(
        "flex w-80 shrink-0 flex-col rounded-2xl border-t-4 bg-muted/25 ring-1 ring-foreground/10 transition-[background-color,box-shadow] duration-150",
        style.top,
        dragging && !isOver && "bg-muted/45 ring-foreground/25",
        isOver && "bg-emerald-500/10 ring-2 ring-emerald-400/60",
      )}
    >
      <header className="space-y-2.5 p-3">
        <div className="flex items-center gap-2">
          {editing ? (
            <Input
              autoFocus
              value={name}
              maxLength={30}
              onChange={(e) => setName(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitName();
                if (e.key === "Escape") {
                  setName(category.name);
                  setEditing(false);
                }
              }}
              className="h-9"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              title="Clique para renomear"
              className="min-w-0 flex-1 truncate text-left text-base font-semibold hover:underline"
            >
              {category.name}
            </button>
          )}
          <span className="shrink-0 rounded-md bg-foreground/10 px-2 py-0.5 text-xs font-semibold tabular-nums">
            {entries.length}
          </span>

          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={`Opções da categoria ${category.name}`}
              className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <MoreVertical className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-52">
              <DropdownMenuItem onClick={() => setEditing(true)}>Renomear</DropdownMenuItem>
              <DropdownMenuItem disabled={index === 0} onClick={() => onShift(-1)}>
                <ChevronLeft className="size-4" /> Mover para a esquerda
              </DropdownMenuItem>
              <DropdownMenuItem disabled={index === total - 1} onClick={() => onShift(1)}>
                <ChevronRight className="size-4" /> Mover para a direita
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>Cor</DropdownMenuLabel>
                {CATEGORY_COLORS.map((c) => (
                  <DropdownMenuItem key={c} onClick={() => onRecolor(c)}>
                    <span className={cn("size-3 rounded-full", COLOR_STYLES[c].dot)} />
                    {COLOR_STYLES[c].label}
                    {c === category.color && <span className="ml-auto text-xs">atual</span>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                <Trash2 className="size-4" /> Apagar categoria
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {armedChampion && (
          <Button size="sm" variant="secondary" className="w-full" onClick={onPlaceArmed}>
            <Plus className="size-4" /> Colocar {armedChampion.name} aqui
          </Button>
        )}
      </header>

      <SortableContext
        items={entries.map((e) => `card:${e.championId}`)}
        strategy={verticalListSortingStrategy}
      >
        <ul ref={setNodeRef} className="flex min-h-40 flex-1 flex-col gap-2 p-3 pt-0">
          {entries.map((e) => {
            const champion = championsById.get(e.championId) ?? {
              id: e.championId,
              name: e.championId,
              iconUrl: "",
            };
            return (
              <BoardCard
                key={e.championId}
                entry={e}
                champion={champion}
                categories={categories}
                onMove={(categoryId) => onMoveCard(e.championId, categoryId)}
                onRemove={() => onRemoveCard(e.championId)}
              />
            );
          })}
          {entries.length === 0 && (
            <li className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-foreground/15 p-4 text-center text-sm text-muted-foreground">
              Arraste campeões da lista para cá
            </li>
          )}
        </ul>
      </SortableContext>
    </section>
  );
}

function TrashZone() {
  const { setNodeRef, isOver } = useDroppable({ id: "trash" });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex items-center justify-center gap-2 rounded-xl border-2 border-dashed p-3 text-sm",
        isOver
          ? "border-rose-400 bg-rose-500/15 text-rose-300"
          : "border-foreground/20 text-muted-foreground",
      )}
    >
      <Trash2 className="size-4" /> Solte aqui para remover do quadro
    </div>
  );
}

// ---------------------------------------------------------------------------
// Espaço de trabalho: colunas + paleta
// ---------------------------------------------------------------------------

export function Workspace({
  data,
  player,
  lane,
  champions,
}: {
  data: PicksData;
  player: PickPlayer;
  lane: Role;
  champions: ChampionOption[];
}) {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [active, setActive] = useState<DragData | null>(null);
  const [armed, setArmed] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  // Começa na rota do quadro; "ALL" mostra todos os campeões.
  const [laneFilter, setLaneFilter] = useState<Role | "ALL">(lane);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<CategoryColor>("emerald");

  const championsById = useMemo(() => new Map(champions.map((c) => [c.id, c])), [champions]);
  const entries = useMemo(() => boardEntries(data, player.id, lane), [data, player.id, lane]);
  const byCategory = useMemo(() => {
    const map = new Map<number, PickEntry[]>();
    for (const c of data.categories) map.set(c.id, []);
    for (const e of entries) map.get(e.categoryId)?.push(e);
    return map;
  }, [entries, data.categories]);
  const placed = useMemo(() => new Map(entries.map((e) => [e.championId, e.categoryId])), [entries]);
  const categoriesById = useMemo(
    () => new Map(data.categories.map((c) => [c.id, c])),
    [data.categories],
  );

  // --- mutações com atualização otimista -----------------------------------------
  const refresh = () => qc.invalidateQueries({ queryKey: ["picks"] });

  const move = useMutation({
    mutationFn: (v: MoveVars) => putEntry(v),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: ["picks"] });
      const previous = qc.getQueryData<PicksData>(["picks"]);
      if (previous) qc.setQueryData(["picks"], applyMove(previous, v));
      return { previous };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(["picks"], ctx.previous);
      toast.error(errorMessage(e));
    },
    onSettled: refresh,
  });

  const remove = useMutation({
    mutationFn: (k: EntryKey) => deleteEntry(k),
    onMutate: async (k) => {
      await qc.cancelQueries({ queryKey: ["picks"] });
      const previous = qc.getQueryData<PicksData>(["picks"]);
      if (previous) qc.setQueryData(["picks"], applyRemove(previous, k));
      return { previous };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(["picks"], ctx.previous);
      toast.error(errorMessage(e));
    },
    onSettled: refresh,
  });

  interface CategoryOp {
    run: () => Promise<unknown>;
    /** Como a tela deve ficar já, antes de o servidor responder. */
    optimistic?: (data: PicksData) => PicksData;
    success?: string;
  }
  const categoryOp = useMutation({
    mutationFn: (op: CategoryOp) => op.run(),
    onMutate: async (op) => {
      if (!op.optimistic) return { previous: undefined };
      await qc.cancelQueries({ queryKey: ["picks"] });
      const previous = qc.getQueryData<PicksData>(["picks"]);
      if (previous) qc.setQueryData(["picks"], op.optimistic(previous));
      return { previous };
    },
    onSuccess: (_d, op) => {
      if (op.success) toast.success(op.success);
    },
    onError: (e, _op, ctx) => {
      if (ctx?.previous) qc.setQueryData(["picks"], ctx.previous);
      toast.error(errorMessage(e));
    },
    onSettled: refresh,
  });

  const place = (championId: string, categoryId: number, index: number) =>
    move.mutate({ playerId: player.id, lane, championId, categoryId, index });
  const take = (championId: string) => {
    const entry = entries.find((e) => e.championId === championId);
    remove.mutate({ playerId: player.id, lane, championId });
    if (!entry) return;

    const name = championsById.get(championId)?.name ?? championId;
    const index = (byCategory.get(entry.categoryId) ?? []).findIndex(
      (e) => e.championId === championId,
    );
    toast(`${name} removido do quadro`, {
      action: {
        label: "Desfazer",
        onClick: () => place(championId, entry.categoryId, Math.max(index, 0)),
      },
    });
  };

  // --- arrastar e soltar -----------------------------------------------------------
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragStart(e: DragStartEvent) {
    setActive((e.active.data.current as DragData | undefined) ?? null);
  }

  function onDragEnd(e: DragEndEvent) {
    setActive(null);
    const dragged = e.active.data.current as DragData | undefined;
    const over = e.over;
    if (!dragged || !over) return;
    const overId = String(over.id);

    if (overId === "trash") {
      if (dragged.type === "card") take(dragged.championId);
      return;
    }

    if (overId.startsWith("col:")) {
      const categoryId = Number(overId.slice(4));
      const list = byCategory.get(categoryId) ?? [];
      const already = list.filter((x) => x.championId !== dragged.championId).length;
      place(dragged.championId, categoryId, already);
      return;
    }

    if (overId.startsWith("card:")) {
      const overChampion = overId.slice(5);
      const target = entries.find((x) => x.championId === overChampion);
      if (!target || overChampion === dragged.championId) return;
      const list = byCategory.get(target.categoryId) ?? [];
      const index = list.findIndex((x) => x.championId === overChampion);
      place(dragged.championId, target.categoryId, Math.max(index, 0));
    }
  }

  // --- paleta ---------------------------------------------------------------------
  const term = norm(search.trim());
  // Sem dado de rotas (fonte fora do ar) o filtro some e a lista fica completa.
  const hasLaneData = useMemo(() => champions.some((c) => c.lanes.length > 0), [champions]);
  const byLane = useMemo(
    () =>
      !hasLaneData || laneFilter === "ALL"
        ? champions
        : // campeão sem rota conhecida (novo demais) aparece em qualquer filtro
          champions.filter((c) => c.lanes.length === 0 || c.lanes.includes(laneFilter)),
    [champions, hasLaneData, laneFilter],
  );
  const filtered = useMemo(
    () => (term ? byLane.filter((c) => norm(c.name).includes(term)) : byLane),
    [byLane, term],
  );
  const laneCounts = useMemo(() => {
    const counts = new Map<Role, number>();
    for (const l of LANE_ORDER) {
      counts.set(
        l,
        champions.filter((c) => c.lanes.length === 0 || c.lanes.includes(l)).length,
      );
    }
    return counts;
  }, [champions]);
  const armedChampion = armed ? (championsById.get(armed) ?? null) : null;
  const activeChampion = active ? (championsById.get(active.championId) ?? null) : null;

  const cats = data.categories;

  const shift = (i: number, direction: -1 | 1) => {
    const ids = cats.map((c) => c.id);
    const j = i + direction;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    categoryOp.mutate({
      run: () => reorderCategories(ids),
      optimistic: (d) => ({
        ...d,
        categories: ids
          .map((id, position) => {
            const found = d.categories.find((x) => x.id === id);
            return found ? { ...found, position } : null;
          })
          .filter((x): x is PickCategory => x !== null),
      }),
    });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActive(null)}
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_26rem]">
        {/* Quadro */}
        <div className="min-w-0 space-y-3">
          {active?.type === "card" && <TrashZone />}

          <ScrollArea orientation="horizontal" className="w-full">
            <div className="flex w-max items-start gap-4 px-1 pb-6 pt-1">
              {cats.map((c, i) => (
                <Column
                  key={c.id}
                  category={c}
                  entries={byCategory.get(c.id) ?? []}
                  championsById={championsById}
                  categories={cats}
                  index={i}
                  total={cats.length}
                  armedChampion={armedChampion}
                  dragging={active !== null}
                  onPlaceArmed={() => {
                    if (!armed) return;
                    place(armed, c.id, (byCategory.get(c.id) ?? []).length);
                    setArmed(null);
                  }}
                  onRename={(name) =>
                    categoryOp.mutate({
                      run: () => updateCategory(c.id, { name }),
                      optimistic: (d) => ({
                        ...d,
                        categories: d.categories.map((x) => (x.id === c.id ? { ...x, name } : x)),
                      }),
                    })
                  }
                  onRecolor={(color) =>
                    categoryOp.mutate({
                      run: () => updateCategory(c.id, { color }),
                      optimistic: (d) => ({
                        ...d,
                        categories: d.categories.map((x) => (x.id === c.id ? { ...x, color } : x)),
                      }),
                    })
                  }
                  onShift={(d) => shift(i, d)}
                  onDelete={async () => {
                    const all = data.entries.filter((e) => e.categoryId === c.id).length;
                    const ok = await confirm({
                      title: `Apagar a categoria "${c.name}"?`,
                      description:
                        all > 0
                          ? `Isso remove ${all} ${all === 1 ? "campeão" : "campeões"} dessa categoria em todos os jogadores e rotas. Não pode ser desfeito.`
                          : "A categoria está vazia.",
                      confirmLabel: "Apagar categoria",
                      destructive: true,
                    });
                    if (!ok) return;
                    categoryOp.mutate({
                      run: () => deleteCategory(c.id),
                      success: `Categoria "${c.name}" apagada`,
                      optimistic: (d) => ({
                        ...d,
                        categories: d.categories.filter((x) => x.id !== c.id),
                        entries: d.entries.filter((e) => e.categoryId !== c.id),
                      }),
                    });
                  }}
                  onMoveCard={(championId, categoryId) =>
                    place(championId, categoryId, (byCategory.get(categoryId) ?? []).length)
                  }
                  onRemoveCard={take}
                />
              ))}

              {/* Nova categoria */}
              <form
                className="w-72 shrink-0 space-y-3 rounded-2xl border-2 border-dashed border-foreground/15 p-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  const name = newName.trim();
                  if (!name) return;
                  categoryOp.mutate(
                    {
                      run: () => createCategory({ name, color: newColor }),
                      success: `Categoria "${name}" criada`,
                    },
                    { onSuccess: () => setNewName("") },
                  );
                }}
              >
                <p className="text-sm font-semibold">Nova categoria</p>
                <Input
                  placeholder="Ex.: Prioridade, Testando…"
                  aria-label="Nome da nova categoria"
                  maxLength={30}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <div className="flex gap-2" role="group" aria-label="Cor da nova categoria">
                  {CATEGORY_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={COLOR_STYLES[c].label}
                      aria-pressed={c === newColor}
                      onClick={() => setNewColor(c)}
                      className={cn(
                        "size-6 rounded-full ring-offset-2 ring-offset-background",
                        COLOR_STYLES[c].dot,
                        c === newColor && "ring-2 ring-foreground",
                      )}
                    />
                  ))}
                </div>
                <Button type="submit" size="sm" disabled={newName.trim().length === 0}>
                  <Plus className="size-4" /> Criar categoria
                </Button>
              </form>
            </div>
          </ScrollArea>

          {cats.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Crie a primeira categoria (por exemplo, Prioridade ou Testando) para começar a
              organizar os campeões.
            </p>
          )}
        </div>

        {/* Lista de campeões */}
        <aside
          aria-label="Campeões"
          className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/10 xl:sticky xl:top-4 xl:h-[calc(100vh-2rem)] xl:self-start"
        >
          <Input
            placeholder="Buscar campeão…"
            aria-label="Buscar campeão"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10"
          />

          {hasLaneData && (
            <div
              role="group"
              aria-label="Filtrar campeões por rota"
              className="flex flex-wrap gap-1.5"
            >
              {(["ALL", ...LANE_ORDER] as const).map((l) => {
                const on = laneFilter === l;
                return (
                  <button
                    key={l}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setLaneFilter(l)}
                    className={cn(
                      "rounded-lg px-2.5 py-1.5 text-xs font-semibold ring-1 transition-colors",
                      on
                        ? "bg-emerald-500/15 text-emerald-300 ring-emerald-400/50"
                        : "text-muted-foreground ring-foreground/15 hover:bg-muted/50",
                    )}
                  >
                    {l === "ALL" ? "Todas" : ROLE_LABEL[l]}
                    <span className="ml-1 font-normal opacity-70">
                      {l === "ALL" ? champions.length : laneCounts.get(l)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {armedChampion && (
            <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
              <strong>{armedChampion.name}</strong> selecionado: clique em “Colocar aqui” numa
              categoria (ou arraste).{" "}
              <button type="button" className="underline" onClick={() => setArmed(null)}>
                Cancelar
              </button>
            </p>
          )}

          <ScrollArea className="min-h-0 flex-1 max-xl:h-128">
            <div className="space-y-5 p-1 pr-4">
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {hasLaneData && laneFilter !== "ALL"
                    ? `Campeões de ${ROLE_LABEL[laneFilter]}`
                    : "Todos os campeões"}{" "}
                  ({filtered.length})
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {filtered.map((c) => (
                    <PaletteTile
                      key={c.id}
                      champion={c}
                      placedIn={categoriesById.get(placed.get(c.id) ?? -1) ?? null}
                      armed={armed === c.id}
                      onArm={() => setArmed((cur) => (cur === c.id ? null : c.id))}
                    />
                  ))}
                </div>
              </section>
            </div>
          </ScrollArea>
        </aside>
      </div>

      <DragOverlay>
        {activeChampion && (
          <div className="flex items-center gap-2.5 rounded-xl bg-card p-2 shadow-xl ring-2 ring-foreground/40">
            <ChampionIcon champion={activeChampion} size={44} className="rounded-lg" />
            <span className="pr-2 text-sm font-semibold">{activeChampion.name}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
