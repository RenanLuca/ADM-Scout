import { getTeamBans } from "@/lib/bans";

export async function GET(_req: Request, ctx: RouteContext<"/api/times/[slug]/bans">) {
  const { slug } = await ctx.params;

  try {
    const data = await getTeamBans(slug);
    if (!data) {
      return Response.json(
        { error: "Time não encontrado.", code: "not_found" },
        { status: 404 },
      );
    }
    return Response.json(data);
  } catch (err) {
    console.error("[bans]", err);
    return Response.json(
      { error: "Não foi possível montar os possíveis bans.", code: "unknown" },
      { status: 502 },
    );
  }
}
