import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, authToken, safeEqual } from "@/lib/auth";

/**
 * Pede a senha (APP_PASSWORD) para qualquer página ou API do app.
 * Sem a variável: em desenvolvimento libera; em produção bloqueia (falha fechada).
 */
export async function proxy(request: NextRequest) {
  const password = process.env.APP_PASSWORD;

  if (!password) {
    if (process.env.NODE_ENV === "production") {
      return new NextResponse("APP_PASSWORD não configurada no servidor.", { status: 503 });
    }
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (token && safeEqual(token, await authToken(password))) {
    return NextResponse.next();
  }

  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Não autorizado. Entre com a senha.", code: "unauthorized" },
      { status: 401 },
    );
  }

  const login = request.nextUrl.clone();
  login.pathname = "/entrar";
  login.search = "";
  login.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(login);
}

export const config = {
  // Tudo, menos arquivos estáticos do Next, o favicon e a própria tela/rota de login.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|entrar|api/entrar).*)"],
};
