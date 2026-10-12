export type Tier = "S" | "A" | "B";

/**
 * Tier list de prioridade de ban (fonte: organização do campeonato).
 * Nomes em inglês, como o Data Dragon; abreviações e erros de grafia normalizados
 * ("Mf" → Miss Fortune, "Shyvanna" → Shyvana, "Cho Gath" → Cho'Gath, "Dr Mundo" → Dr. Mundo).
 */
export const TIER_LIST: Record<Tier, string[]> = {
  S: [
    "Swain",
    "Shyvana",
    "Amumu",
    "Mordekaiser",
    "Brand",
    "Miss Fortune",
    "Sett",
    "Dr. Mundo",
    "Illaoi",
  ],
  A: ["Malphite", "Urgot", "Garen", "Sion", "Cho'Gath", "Seraphine", "Malzahar", "Volibear"],
  B: ["Nasus", "Mel", "Shen", "Trundle", "Sivir"],
};

export const TIER_ORDER: Tier[] = ["S", "A", "B"];
