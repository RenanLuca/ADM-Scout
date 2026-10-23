import { getTeam } from "@/lib/cblol";
import { getDb } from "@/lib/db";
import { handleError, jsonError, readJson } from "@/lib/http";
import { parseRiotId } from "@/lib/riot-ids";

type Ctx = RouteContext<"/api/times/[slug]/jogadores/[playerSlug]/riot-id">;

/** Confere que o jogador existe no elenco do time antes de gravar. */
async function playerExists(slug: string, playerSlug: string): Promise<boolean> {
  const data = await getTeam(slug).catch(() => null);
  return Boolean(data?.players.some((p) => p.slug === playerSlug));
}

/** Define o Riot ID do jogador ("Nome#TAG"); `riotId: null` marca como sem Riot ID. */
export async function PUT(req: Request, ctx: Ctx) {
  try {
    const { slug, playerSlug } = await ctx.params;
    const body = await readJson(req);
    const riotId = body.riotId === null ? null : parseRiotId(body.riotId);

    if (!(await playerExists(slug, playerSlug))) {
      return jsonError("Jogador não encontrado.", "not_found", 404);
    }
    await getDb().riotIdOverride.upsert({
      where: { playerSlug },
      create: { playerSlug, riotId },
      update: { riotId },
    });
    return Response.json({ ok: true });
  } catch (err) {
    return handleError(err, "riot-id:put");
  }
}

/** Remove o ajuste manual: o jogador volta a usar o link do OP.GG do cblow.xyz. */
export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const { playerSlug } = await ctx.params;
    await getDb().riotIdOverride.deleteMany({ where: { playerSlug } });
    return Response.json({ ok: true });
  } catch (err) {
    return handleError(err, "riot-id:delete");
  }
}
