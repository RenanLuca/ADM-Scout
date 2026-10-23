import { getTeam } from "@/lib/cblol";
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
