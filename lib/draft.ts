import {
  competitiveWinrate,
  gamesOf,
  loadTeamUsage,
  mastery,
} from "./bans";
import { laneIndex } from "./lanes";
import type { BanUsage, DraftPick, DraftTier, PlayerDraft, TeamDraft } from "./types";

// ---------------------------------------------------------------------------
// Draft: os picks de cada jogador, separados pelo domínio que ele tem do campeão.
//
// Usa o mesmo domínio dos bans (soloq + treinos + campeonato, com o WR de treino
// e jogo oficial ajustando o volume), então "Melhores" e "bans fortes" concordam.
//   melhores: domínio ≥ 0,55   (~30 jogos com WR neutro)
//   bons:     domínio ≥ 0,30   (~9 jogos)
//   médios:   domínio ≥ 0,15   (~3 jogos)
// Abaixo disso o campeão nem aparece: é amostra pequena demais para virar pick.
// ---------------------------------------------------------------------------

const BEST_MIN = 0.55;
const GOOD_MIN = 0.3;
const MEDIUM_MIN = 0.15;
/** Para o médio não virar a lista inteira da soloq: só os mais jogados. */
const MEDIUM_LIMIT = 10;

function tierOf(m: number): DraftTier | null {
  if (m >= BEST_MIN) return "best";
  if (m >= GOOD_MIN) return "good";
  if (m >= MEDIUM_MIN) return "medium";
  return null;
}

/** Picks de um jogador por faixa, cada faixa do mais ao menos dominado. */
export async function getTeamDraft(
  slug: string,
  /** Escalação (slugs dos jogadores). Vazia/ausente = elenco inteiro. */
  onlySlugs?: string[],
): Promise<TeamDraft | null> {
  const loaded = await loadTeamUsage(slug, onlySlugs);
  if (!loaded) return null;
  const { team, usage, meta, roster, roleByNick, unavailable } = loaded;

  const byNick = new Map<string, { u: BanUsage; id: string; m: number }[]>();
  for (const [id, players] of usage) {
    for (const [nick, u] of players) {
      const list = byNick.get(nick) ?? [];
      list.push({ u, id, m: mastery(u) });
      byNick.set(nick, list);
    }
  }

  const players: PlayerDraft[] = roster.map((p) => {
    const picks: Record<DraftTier, DraftPick[]> = { best: [], good: [], medium: [] };
    const ranked = (byNick.get(p.name) ?? []).sort(
      (a, b) => b.m - a.m || gamesOf(b.u) - gamesOf(a.u),
    );
    for (const { u, id, m } of ranked) {
      const tier = tierOf(m);
      const champion = meta.get(id);
      if (!tier || !champion) continue;
      picks[tier].push({
        ...champion,
        usage: u,
        games: gamesOf(u),
        competitiveWinrate: competitiveWinrate(u),
      });
    }
    picks.medium = picks.medium.slice(0, MEDIUM_LIMIT);
    return { nick: p.name, slug: p.slug, role: roleByNick.get(p.name) ?? p.role, picks };
  });

  players.sort((a, b) => laneIndex(a.role) - laneIndex(b.role));

  return { team, players, unavailable };
}
