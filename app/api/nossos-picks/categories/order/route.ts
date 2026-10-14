import { getDb } from "@/lib/db";
import { handleError, readJson } from "@/lib/http";
import { InputError, parseId } from "@/lib/picks";

/** Define a ordem das categorias: `ids` na ordem desejada. */
export async function PUT(req: Request) {
  try {
    const body = await readJson(req);
    if (!Array.isArray(body.ids) || body.ids.length === 0) {
      throw new InputError("Informe a lista de categorias.");
    }
    const ids = body.ids.map((v) => parseId(v, "categoria"));
    if (new Set(ids).size !== ids.length) throw new InputError("Categorias repetidas.");

    const db = getDb();
    await db.$transaction(
      ids.map((id, position) =>
        db.pickCategory.updateMany({ where: { id }, data: { position } }),
      ),
    );
    return Response.json({ ok: true });
  } catch (err) {
    return handleError(err, "nossos-picks:categories:order");
  }
}
