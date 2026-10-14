import { getDb } from "@/lib/db";
import { handleError, jsonError, readJson } from "@/lib/http";
import {
  InputError,
  isLane,
  parseChampionId,
  parseId,
  parseIndex,
} from "@/lib/picks";

/**
 * Coloca (ou move) um campeão de um jogador, numa rota, dentro de uma categoria,
 * na posição `index`. O mesmo campeão só existe uma vez por jogador+rota.
 */
export async function PUT(req: Request) {
  try {
    const body = await readJson(req);
    const playerId = parseId(body.playerId, "jogador");
    const categoryId = parseId(body.categoryId, "categoria");
    const championId = parseChampionId(body.championId);
    const index = parseIndex(body.index);
    if (!isLane(body.lane)) throw new InputError("Rota inválida.");
    const lane = body.lane;

    const db = getDb();
    const result = await db.$transaction(async (tx) => {
      const player = await tx.player.findUnique({ where: { id: playerId } });
      if (!player) return "player" as const;
      if (!player.lanes.includes(lane)) return "lane" as const;
      const category = await tx.pickCategory.findUnique({
        where: { id: categoryId },
        select: { id: true },
      });
      if (!category) return "category" as const;

      const siblings = await tx.pickEntry.findMany({
        where: { playerId, lane, categoryId, NOT: { championId } },
        orderBy: { position: "asc" },
        select: { id: true },
      });
      const entry = await tx.pickEntry.upsert({
        where: { playerId_lane_championId: { playerId, lane, championId } },
        create: { playerId, lane, championId, categoryId, position: 0 },
        update: { categoryId },
      });

      const order = siblings.map((s) => s.id);
      order.splice(Math.min(index, order.length), 0, entry.id);
      await Promise.all(
        order.map((id, position) => tx.pickEntry.update({ where: { id }, data: { position } })),
      );
      return "ok" as const;
    });

    if (result === "player") return jsonError("Jogador não encontrado.", "not_found", 404);
    if (result === "category") return jsonError("Categoria não encontrada.", "not_found", 404);
    if (result === "lane") return jsonError("O jogador não joga nessa rota.", "invalid", 400);
    return Response.json({ ok: true });
  } catch (err) {
    return handleError(err, "nossos-picks:entries:put");
  }
}

/** Tira o campeão do quadro de uma rota do jogador. */
export async function DELETE(req: Request) {
  try {
    const body = await readJson(req);
    const playerId = parseId(body.playerId, "jogador");
    const championId = parseChampionId(body.championId);
    if (!isLane(body.lane)) throw new InputError("Rota inválida.");

    await getDb().pickEntry.deleteMany({
      where: { playerId, lane: body.lane, championId },
    });
    return Response.json({ ok: true });
  } catch (err) {
    return handleError(err, "nossos-picks:entries:delete");
  }
}
