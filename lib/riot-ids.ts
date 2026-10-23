import { getDb } from "./db";
import { InputError } from "./picks";

/** Normaliza "Nome #TAG" e espaços duplicados digitados à mão. */
function normalizeRiotId(raw: string): string {
  return raw.replace(/s+#/, "#").replace(/s{2,}/g, " ").trim();
}

/** Valida o Riot ID digitado ("Nome#TAG"). Lança InputError se não servir. */
export function parseRiotId(v: unknown): string {
  const id = typeof v === "string" ? normalizeRiotId(v) : "";
  const i = id.lastIndexOf("#");
  const name = id.slice(0, i).trim();
  const tag = id.slice(i + 1).trim();
  if (i <= 0 || !name || !tag || name.includes("#") || id.length > 60) {
    throw new InputError('Informe o Riot ID no formato "Nome#TAG".');
  }
  return `${name}#${tag}`;
}

/**
 * Riot IDs definidos à mão, por slug do jogador no cblow.xyz (tabela riot_id_overrides).
 *  - string: usa esse valor (tem prioridade sobre o link do OP.GG do cblow.xyz);
 *  - null:   o jogador fica marcado como "sem Riot ID" (inválido por enquanto);
 *  - sem entrada: cai no link do OP.GG do cblow.xyz.
 * Se o banco estiver fora do ar, segue sem overrides (usa só o link do cblow.xyz).
 */
export async function loadRiotIdOverrides(): Promise<Map<string, string | null>> {
  try {
    const rows = await getDb().riotIdOverride.findMany();
    return new Map(rows.map((r) => [r.playerSlug, r.riotId]));
  } catch (err) {
    console.error("[riot-ids] não foi possível ler os Riot IDs do banco:", err);
    return new Map();
  }
}

/**
 * Extrai "Nome#TAG" de um link do OP.GG (".../summoners/br/Nome-TAG").
 * A tag nunca tem hífen; o nome pode virar "Nome-Composto" quando tinha espaço.
 * Sem %20 no link, o hífen é ambíguo: assumimos espaço (comum) e o `riot.ts`
 * tenta de novo com hífen se a Riot não achar a conta.
 */
export function riotIdFromOpgg(url: string): string | null {
  const last = new URL(url).pathname.split("/").filter(Boolean).pop();
  if (!last) return null;

  const raw = last;
  const i = raw.lastIndexOf("-");
  if (i <= 0 || i === raw.length - 1) return null;

  const explicitSpaces = raw.slice(0, i).includes("%20");
  const name = decodeURIComponent(raw.slice(0, i));
  const tag = decodeURIComponent(raw.slice(i + 1));
  return `${explicitSpaces ? name : name.replace(/-/g, " ")}#${tag}`;
}

export function splitRiotId(riotId: string): { gameName: string; tagLine: string } {
  const i = riotId.lastIndexOf("#");
  return { gameName: riotId.slice(0, i), tagLine: riotId.slice(i + 1) };
}

export function opggUrlFor(riotId: string): string {
  const { gameName, tagLine } = splitRiotId(riotId);
  return `https://op.gg/lol/summoners/br/${encodeURIComponent(gameName)}-${encodeURIComponent(tagLine)}`;
}
