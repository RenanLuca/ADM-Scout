import { getDb } from "@/lib/db";
import { handleError, readJson } from "@/lib/http";
import { parseLanes, parseName } from "@/lib/picks";

/** Cria um jogador do time: nome e rotas que joga. */
export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const name = parseName(body.name);
    const lanes = parseLanes(body.lanes);

    const db = getDb();
    const last = await db.player.aggregate({ _max: { position: true } });
    const player = await db.player.create({
      data: { name, lanes, position: (last._max.position ?? -1) + 1 },
    });
    return Response.json({ id: player.id }, { status: 201 });
  } catch (err) {
    return handleError(err, "nossos-picks:players:post");
  }
}
