import { getTrainingStats } from "@/lib/trainings";

export async function GET() {
  try {
    return Response.json(await getTrainingStats());
  } catch (err) {
    console.error("[treinos]", err);
    return Response.json(
      { error: "Não foi possível carregar os treinos do cblow.xyz.", code: "unknown" },
      { status: 502 },
    );
  }
}
