import { getTeams } from "@/lib/cblol";

export async function GET() {
  try {
    return Response.json(await getTeams());
  } catch {
    return Response.json(
      { error: "Não foi possível carregar os times do cblow.xyz.", code: "unknown" },
      { status: 502 },
    );
  }
}
