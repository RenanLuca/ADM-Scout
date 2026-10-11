import { getTeamTrainings } from "@/lib/trainings";

export async function GET(_req: Request, ctx: RouteContext<"/api/times/[slug]/treinos">) {
  const { slug } = await ctx.params;

  try {
    const data = await getTeamTrainings(slug);
    // Time sem nenhum treino registrado: lista vazia, não é erro.
    return Response.json(
      data ?? { team: { slug, name: slug }, trainings: [], pools: [] },
    );
  } catch (err) {
    console.error("[treinos]", err);
    return Response.json(
      { error: "Não foi possível carregar os treinos do cblow.xyz.", code: "unknown" },
      { status: 502 },
    );
  }
}
