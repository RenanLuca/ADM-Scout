import { getTeam } from "@/lib/cblol";
import { getDb } from "@/lib/db";
import { handleError, jsonError } from "@/lib/http";
import { getPlayerStats, isNotFound } from "@/lib/opgg";
import type { StatsMode } from "@/lib/types";

export async function GET(
  req: Request,
  ctx: RouteContext<"/api/times/[slug]/jogadores/[playerSlug]">,
) {
  const { slug, playerSlug } = await ctx.params;
  const mode: StatsMode =
    new URL(req.url).searchParams.get("mode") === "recent" ? "recent" : "season";

  const data = await getTeam(slug).catch(() => null);
  const player = data?.players.find((p) => p.slug === playerSlug);
  if (!player) {
    return Response.json(
      { error: "Jogador não encontrado.", code: "not_found" },
      { status: 404 },
    );
  }
  if (!player.riotId) {
    return Response.json(
      { error: "Jogador sem Riot ID cadastrado.", code: "no_riot_id" },
      { status: 404 },
    );
  }

  try {
    return Response.json(await getPlayerStats(player.riotId, mode, data?.team.name));
  } catch (err) {
    console.error(`[opgg] ${player.riotId}:`, err);
    if (isNotFound(err)) {
      return Response.json(
        {
          error: `Jogador "${player.riotId}" não encontrado no OP.GG. Se o jogador mudou de nick, atualize o nick no card do jogador.`,
          code: "not_found",
        },
        { status: 404 },
      );
    }
    return Response.json(
      {
        error: `OP.GG indisponível: ${err instanceof Error ? err.message : "erro desconhecido"}`,
        code: "unknown",
      },
      { status: 502 },
    );
  }
}

/** Tira o jogador do elenco (saiu do time durante o camp). */
export async function DELETE(
  _req: Request,
  ctx: RouteContext<"/api/times/[slug]/jogadores/[playerSlug]">,
) {
  try {
    const { slug, playerSlug } = await ctx.params;
    const data = await getTeam(slug).catch(() => null);
    if (!data?.players.some((p) => p.slug === playerSlug)) {
      return jsonError("Jogador não encontrado.", "not_found", 404);
    }
    await getDb().removedPlayer.upsert({
      where: { playerSlug },
      create: { playerSlug },
      update: {},
    });
    return Response.json({ ok: true });
  } catch (err) {
    return handleError(err, "player:delete");
  }
}
