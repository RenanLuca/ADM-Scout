import { getTeamChampionship } from "@/lib/championship";

export async function GET(_req: Request, ctx: RouteContext<"/api/times/[slug]/campeonato">) {
  const { slug } = await ctx.params;

  try {
    return Response.json(await getTeamChampionship(slug));
  } catch (err) {
    console.error("[campeonato]", err);
    return Response.json(
      { error: "Não foi possível carregar o campeonato do cblow.xyz.", code: "unknown" },
      { status: 502 },
    );
  }
}
