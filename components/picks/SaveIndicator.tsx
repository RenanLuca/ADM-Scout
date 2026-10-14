"use client";

import { useIsMutating } from "@tanstack/react-query";
import { Check, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Mostra "Salvando…" enquanto há qualquer gravação em andamento e "Salvo" por um instante depois. */
export function SaveIndicator({ className }: { className?: string }) {
  const pending = useIsMutating();
  const [saved, setSaved] = useState(false);
  const wasPending = useRef(false);

  useEffect(() => {
    if (pending > 0) {
      wasPending.current = true;
      return;
    }
    if (!wasPending.current) return;

    wasPending.current = false;
    setSaved(true);
    const t = window.setTimeout(() => setSaved(false), 1800);
    return () => window.clearTimeout(t);
  }, [pending]);

  const visible = pending > 0 || saved;

  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1 text-xs font-medium transition-all duration-200",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0",
        className,
      )}
    >
      {pending > 0 ? (
        <>
          <Loader2 className="size-3.5 animate-spin" /> Salvando…
        </>
      ) : (
        <>
          <Check className="size-3.5 text-emerald-400" /> Salvo
        </>
      )}
    </span>
  );
}
