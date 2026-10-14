import { InputError } from "./picks";

export function jsonError(message: string, code: string, status: number): Response {
  return Response.json({ error: message, code }, { status });
}

/** Lê o corpo JSON; corpo ausente ou inválido vira um objeto vazio (a validação reclama depois). */
export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await req.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Padroniza erros de rotas de escrita: entrada inválida vira 400; o resto, 500 sem vazar detalhes. */
export function handleError(err: unknown, context: string): Response {
  if (err instanceof InputError) return jsonError(err.message, "invalid", 400);
  console.error(`[${context}]`, err);
  return jsonError("Erro interno ao acessar o banco.", "unknown", 500);
}
