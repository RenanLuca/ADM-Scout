import overrides from "@/data/riot-ids.json";

const overrideMap = overrides as Record<string, string>;

/** Correção manual ("Nome#TAG") para quando o OP.GG do cblow.xyz não resolve a conta certa. */
export function getRiotIdOverride(playerSlug: string): string | null {
  const id = overrideMap[playerSlug]?.trim();
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
