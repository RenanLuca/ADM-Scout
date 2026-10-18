import { getTeamDraft } from "@/lib/draft";

export async function GET(req: Request, ctx: RouteContext<"/api/times/[slug]/draft">) {
  const { slug } = await ctx.params;

  // ?players=slug1,slug2,... restringe aos jogadores marcados (validados contra o elenco).
  const players = (new URL(req.url).searchParams.get("players") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[a-z0-9-]+$/.test(s))
    .slice(0, 20);

  try {
    const data = await getTeamDraft(slug, players);
    if (!data) {
      return Response.json(
        { error: "Time não encontrado.", code: "not_found" },
        { status: 404 },
      );
    }
    return Response.json(data);
  } catch (err) {
    console.error("[draft]", err);
    return Response.json(
      { error: "Não foi possível montar o draft.", code: "unknown" },
      { status: 502 },
    );
  }
}
