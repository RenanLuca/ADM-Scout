import type { CategoryColor } from "@/lib/picks";

/**
 * Classes estáticas por token de cor (o Tailwind só gera classes escritas por
 * extenso, então nada de montar nomes dinamicamente).
 */
export const COLOR_STYLES: Record<
  CategoryColor,
  { label: string; dot: string; top: string; chip: string }
> = {
  slate: {
    label: "Cinza",
    dot: "bg-slate-400",
    top: "border-t-slate-400",
    chip: "bg-slate-500/15 text-slate-300 ring-slate-400/30",
  },
  emerald: {
    label: "Verde",
    dot: "bg-emerald-400",
    top: "border-t-emerald-400",
    chip: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30",
  },
  sky: {
    label: "Azul",
    dot: "bg-sky-400",
    top: "border-t-sky-400",
    chip: "bg-sky-500/15 text-sky-300 ring-sky-400/30",
  },
  amber: {
    label: "Amarelo",
    dot: "bg-amber-400",
    top: "border-t-amber-400",
    chip: "bg-amber-500/15 text-amber-300 ring-amber-400/30",
  },
  rose: {
    label: "Vermelho",
    dot: "bg-rose-400",
    top: "border-t-rose-400",
    chip: "bg-rose-500/15 text-rose-300 ring-rose-400/30",
  },
  violet: {
    label: "Roxo",
    dot: "bg-violet-400",
    top: "border-t-violet-400",
    chip: "bg-violet-500/15 text-violet-300 ring-violet-400/30",
  },
};
