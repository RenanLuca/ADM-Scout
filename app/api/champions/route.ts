import { listChampions } from "@/lib/ddragon";
import { jsonError } from "@/lib/http";

/** Todos os campeões do Data Dragon (cacheado no servidor por dias). */
export async function GET() {
  try {
    return Response.json(await listChampions());
  } catch (err) {
    console.error("[champions]", err);
    return jsonError("Não foi possível carregar os campeões.", "unknown", 502);
  }
}
