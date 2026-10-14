import { getDb } from "@/lib/db";
import { handleError, jsonError, readJson } from "@/lib/http";
import { InputError, isCategoryColor, parseId, parseName } from "@/lib/picks";

type Ctx = RouteContext<"/api/nossos-picks/categories/[id]">;

/** Renomeia e/ou troca a cor. */
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const id = parseId((await ctx.params).id);
    const body = await readJson(req);

    const data: { name?: string; color?: string } = {};
    if ("name" in body) data.name = parseName(body.name, "Nome da categoria", 30);
    if ("color" in body) {
      if (!isCategoryColor(body.color)) throw new InputError("Cor inválida.");
      data.color = body.color;
    }

    const { count } = await getDb().pickCategory.updateMany({ where: { id }, data });
    if (count === 0) return jsonError("Categoria não encontrada.", "not_found", 404);
    return Response.json({ id });
  } catch (err) {
    return handleError(err, "nossos-picks:categories:patch");
  }
}

/** Apaga a categoria e, em cascata, os campeões que estavam nela. */
export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const id = parseId((await ctx.params).id);
    const { count } = await getDb().pickCategory.deleteMany({ where: { id } });
    if (count === 0) return jsonError("Categoria não encontrada.", "not_found", 404);
    return Response.json({ ok: true });
  } catch (err) {
    return handleError(err, "nossos-picks:categories:delete");
  }
}
