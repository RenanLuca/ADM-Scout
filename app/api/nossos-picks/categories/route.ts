import { getDb } from "@/lib/db";
import { handleError, readJson } from "@/lib/http";
import { InputError, isCategoryColor, parseName } from "@/lib/picks";

/** Cria uma categoria (coluna do quadro) no fim da fila. */
export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const name = parseName(body.name, "Nome da categoria", 30);
    const color = body.color ?? "slate";
    if (!isCategoryColor(color)) throw new InputError("Cor inválida.");

    const db = getDb();
    const last = await db.pickCategory.aggregate({ _max: { position: true } });
    const category = await db.pickCategory.create({
      data: { name, color, position: (last._max.position ?? -1) + 1 },
    });
    return Response.json({ id: category.id }, { status: 201 });
  } catch (err) {
    return handleError(err, "nossos-picks:categories:post");
  }
}
