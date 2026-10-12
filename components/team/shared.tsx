import Image from "next/image";
import type { ChampionRef, Role } from "@/lib/types";
import { cn } from "@/lib/utils";

export const ROLE_LABEL: Record<Role, string> = {
  TOP: "Top",
  JUNGLE: "Jungle",
  MID: "Mid",
  ADC: "ADC",
  SUPPORT: "Suporte",
};

export function ChampionIcon({
  champion,
  size = 28,
  className,
}: {
  champion: Pick<ChampionRef, "name" | "iconUrl">;
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src={champion.iconUrl}
      alt={champion.name}
      title={champion.name}
      width={size}
      height={size}
      className={cn("shrink-0 rounded-md ring-1 ring-foreground/10", className)}
      style={{ width: size, height: size }}
    />
  );
}

// ---------------------------------------------------------------------------
// Cores de desempenho: verde bom, âmbar mediano, vermelho ruim.
// ---------------------------------------------------------------------------

const GOOD = "text-emerald-400";
const OK = "text-amber-300";
const BAD = "text-rose-400";

/** Winrate (0–1): acima de 50% verde, 50% âmbar, abaixo vermelho. */
export function winrateTone(winrate: number): string {
  if (winrate > 0.5) return GOOD;
  if (winrate === 0.5) return OK;
  return BAD;
}

/** KDA: 3+ verde, 2–3 âmbar, abaixo de 2 vermelho. */
export function kdaTone(kda: number): string {
  if (kda >= 3) return GOOD;
  if (kda >= 2) return OK;
  return BAD;
}

export const percent = (n: number) => `${Math.round(n * 100)}%`;

export function ResultBadge({ won }: { won: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1",
        won
          ? "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30"
          : "bg-rose-500/15 text-rose-300 ring-rose-400/30",
      )}
    >
      {won ? "Vitória" : "Derrota"}
    </span>
  );
}

/** Número grande com rótulo pequeno em cima, para bater o olho. */
export function Metric({
  label,
  value,
  tone,
  hint,
  size = "md",
}: {
  label: string;
  value: string;
  tone?: string;
  /** Linha pequena abaixo do valor. */
  hint?: string;
  size?: "md" | "lg";
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "font-semibold tabular-nums leading-tight",
          size === "lg" ? "text-xl" : "text-base",
          tone,
        )}
      >
        {value}
      </p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
