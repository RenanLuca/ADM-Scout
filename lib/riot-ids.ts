import overrides from "@/data/riot-ids.json";

const overrideMap = overrides as Record<string, string | null>;

/**
 * Riot ID definido à mão em data/riot-ids.json ("Nome#TAG").
 *  - string: usa esse valor (tem prioridade sobre o link do OP.GG do cblow.xyz);
 *  - null:   o jogador fica marcado como "sem Riot ID" (inválido por enquanto);
 *  - undefined: sem entrada, cai no link do OP.GG do cblow.xyz.
 */
export function getRiotIdOverride(playerSlug: string): string | null | undefined {
  if (!(playerSlug in overrideMap)) return undefined;
  // Tolera "Nome #TAG" e espaços duplicados ao digitar à mão.
  const id = overrideMap[playerSlug]?.replace(/\s+#/, "#").replace(/\s{2,}/g, " ").trim();
  return id && id.includes("#") ? id : null;
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
