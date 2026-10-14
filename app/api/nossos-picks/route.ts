import { connection } from "next/server";
import { handleError } from "@/lib/http";
import { loadPicks } from "@/lib/picks-server";

/** Tudo que a tela precisa de uma vez: jogadores, categorias e entradas. */
export async function GET() {
  // Só roda em requisição real: sem isso o build tentaria consultar o banco.
  await connection();

  try {
    return Response.json(await loadPicks());
  } catch (err) {
    return handleError(err, "nossos-picks:get");
  }
}
