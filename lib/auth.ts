/** Nome do cookie de sessão. */
export const AUTH_COOKIE = "adm_auth";
/** 30 dias. */
export const AUTH_MAX_AGE = 60 * 60 * 24 * 30;

const encoder = new TextEncoder();

/**
 * Token da sessão: HMAC-SHA256 (chave = senha, mensagem fixa) em hexadecimal.
 * Não guarda a senha no cookie e trocar a senha invalida todas as sessões.
 */
export async function authToken(password: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode("adm-scout:v1"));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Comparação em tempo constante (não vaza onde a diferença começa). */
export function safeEqual(a: string, b: string): boolean {
  const x = encoder.encode(a);
  const y = encoder.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  }
  return diff === 0;
}
