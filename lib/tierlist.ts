export type Tier = "S" | "A" | "B";

/**
 * Tier list dos campeões mais roubados do campeonato (fonte: organização).
 * Nomes em inglês, como o Data Dragon; abreviações e erros de grafia normalizados
 * ("Mf" → Miss Fortune, "Shyvanna" → Shyvana, "Cho Gath" → Cho'Gath).
 */
export const TIER_LIST: Record<Tier, string[]> = {
  S: ["Swain", "Shyvana", "Amumu", "Mordekaiser", "Brand", "Miss Fortune", "Sett"],
  A: ["Malphite", "Urgot", "Garen", "Mel", "Sivir", "Illaoi", "Sion"],
  B: ["Nasus", "Volibear", "Malzahar", "Seraphine", "Cho'Gath", "Shen", "Trundle"],
};

export const TIER_ORDER: Tier[] = ["S", "A", "B"];
