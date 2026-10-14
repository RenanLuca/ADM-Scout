"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Phase = "idle" | "loading" | "done";

/**
 * Barra fina no topo durante a troca de página. O App Router não expõe eventos
 * de rota, então ela começa no clique em um link interno e termina quando o
 * caminho muda (com um limite de segurança caso a navegação não aconteça).
 */
export function NavProgress() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("idle");
  const current = useRef(pathname);
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  // Clique em link interno: começa a barra.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const anchor = (e.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.origin !== window.location.origin) return;
      if (anchor.pathname === current.current) return;

      clearTimers();
      setPhase("loading");
      // Segurança: nunca deixa a barra presa se a navegação falhar.
      timers.current.push(window.setTimeout(() => setPhase("idle"), 15000));
    }

    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      clearTimers();
    };
  }, []);

  // O caminho mudou: completa a barra e some.
  useEffect(() => {
    if (current.current === pathname) return;
    current.current = pathname;
    clearTimers();
    setPhase("done");
    timers.current.push(window.setTimeout(() => setPhase("idle"), 400));
  }, [pathname]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5"
      style={{ opacity: phase === "idle" ? 0 : 1, transition: "opacity 300ms ease 100ms" }}
    >
      <div
        className="h-full bg-emerald-400 shadow-[0_0_8px] shadow-emerald-400/60"
        style={{
          width: phase === "loading" ? "85%" : phase === "done" ? "100%" : "0%",
          transition:
            phase === "loading"
              ? "width 10s cubic-bezier(0.1, 0.6, 0.2, 1)"
              : phase === "done"
                ? "width 200ms ease-out"
                : "none",
        }}
      />
    </div>
  );
}
