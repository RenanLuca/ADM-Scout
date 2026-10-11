import { getTeam } from "@/lib/cblol";

export async function GET(_req: Request, ctx: RouteContext<"/api/times/[slug]">) {
  const { slug } = await ctx.params;

  try {
    const data = await getTeam(slug);
    if (!data) {
      return Response.json(
        { error: "Time não encontrado.", code: "not_found" },
        { status: 404 },
      );
    }
    return Response.json(data);
  } catch {
    return Response.json(
      { error: "Não foi possível carregar o time do cblow.xyz.", code: "unknown" },
      { status: 502 },
    );
  }
}
