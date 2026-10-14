import { getDb } from "@/lib/db";
import { handleError, jsonError, readJson } from "@/lib/http";
import { parseId, parseLanes, parseName } from "@/lib/picks";

type Ctx = RouteContext<"/api/nossos-picks/players/[id]">;

/** Edita nome e rotas. Tirar uma rota apaga os campeões dela nesse jogador. */
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const id = parseId((await ctx.params).id);
    const body = await readJson(req);

    const data: { name?: string; lanes?: ReturnType<typeof parseLanes> } = {};
    if ("name" in body) data.name = parseName(body.name);
    if ("lanes" in body) data.lanes = parseLanes(body.lanes);

    const db = getDb();
    const updated = await db.$transaction(async (tx) => {
      const exists = await tx.player.findUnique({ where: { id }, select: { id: true } });
      if (!exists) return null;
      if (data.lanes) {
        await tx.pickEntry.deleteMany({
          where: { playerId: id, lane: { notIn: data.lanes } },
        });
      }
      return tx.player.update({ where: { id }, data });
    });

    if (!updated) return jsonError("Jogador não encontrado.", "not_found", 404);
    return Response.json({ id: updated.id });
  } catch (err) {
    return handleError(err, "nossos-picks:players:patch");
  }
}

/** Apaga o jogador e, em cascata, todos os campeões dele. */
export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const id = parseId((await ctx.params).id);
    const { count } = await getDb().player.deleteMany({ where: { id } });
    if (count === 0) return jsonError("Jogador não encontrado.", "not_found", 404);
    return Response.json({ ok: true });
  } catch (err) {
    return handleError(err, "nossos-picks:players:delete");
  }
}
