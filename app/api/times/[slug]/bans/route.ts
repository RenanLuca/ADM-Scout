import { getTeamBans } from "@/lib/bans";

export async function GET(req: Request, ctx: RouteContext<"/api/times/[slug]/bans">) {
  const { slug } = await ctx.params;

  // ?players=slug1,slug2,... restringe o cálculo aos jogadores marcados (validados contra o elenco).
  const players = (new URL(req.url).searchParams.get("players") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[a-z0-9-]+$/.test(s))
    .slice(0, 20);

  try {
    const data = await getTeamBans(slug, players);
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
