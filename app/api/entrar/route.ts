import { cookies } from "next/headers";
import { AUTH_COOKIE, AUTH_MAX_AGE, authToken, safeEqual } from "@/lib/auth";
import { jsonError, readJson } from "@/lib/http";

/** Entrar: confere a senha e grava o cookie de sessão. */
export async function POST(req: Request) {
  const password = process.env.APP_PASSWORD;
  if (!password) {
    return jsonError("APP_PASSWORD não configurada no servidor.", "unknown", 503);
  }

  const body = await readJson(req);
  const given = typeof body.password === "string" ? body.password : "";

  if (!safeEqual(given, password)) {
    // atraso curto para desencorajar tentativas em sequência
    await new Promise((r) => setTimeout(r, 600));
    return jsonError("Senha incorreta.", "unauthorized", 401);
  }

  const jar = await cookies();
  jar.set(AUTH_COOKIE, await authToken(password), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: AUTH_MAX_AGE,
  });
  return Response.json({ ok: true });
}

/** Sair: apaga o cookie. */
export async function DELETE() {
  const jar = await cookies();
  jar.delete(AUTH_COOKIE);
  return Response.json({ ok: true });
}
