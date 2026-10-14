"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const STEPS = [
  { href: "/nossos-picks/jogadores", label: "Jogadores", hint: "Cadastre o elenco" },
  { href: "/nossos-picks/quadro", label: "Quadro de campeões", hint: "Monte o pool de cada um" },
  { href: "/nossos-picks/escalacao", label: "Escalação", hint: "Veja os picks do time" },
];

/** Navegação entre as telas de Nossos Picks. */
export function PicksNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Nossos Picks" className="grid gap-2 sm:grid-cols-3">
      {STEPS.map((s, i) => {
        const active = pathname.startsWith(s.href);
        return (
          <Link
            key={s.href}
            href={s.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-4 py-3 ring-1 transition-colors",
              active
                ? "bg-emerald-500/10 ring-emerald-400/40"
                : "ring-foreground/10 hover:bg-muted/40",
            )}
          >
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                active ? "bg-emerald-500 text-background" : "bg-foreground/10 text-muted-foreground",
              )}
            >
              {i + 1}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{s.label}</span>
              <span className="block truncate text-xs text-muted-foreground">{s.hint}</span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
