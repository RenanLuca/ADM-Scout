"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "@/lib/api";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Times" },
  { href: "/nossos-picks", label: "Nossos Picks" },
];

export function SiteNav() {
  const pathname = usePathname();
  const router = useRouter();
  const onLogin = pathname.startsWith("/entrar");

  async function signOut() {
    try {
      await logout();
    } finally {
      router.replace("/entrar");
      router.refresh();
    }
  }

  return (
    <header className="border-b border-foreground/10">
      <nav
        aria-label="Principal"
        className="mx-auto flex w-full max-w-5xl items-center gap-1 px-4 py-3 sm:px-6"
      >
        <Link href="/" className="mr-4 font-semibold tracking-tight">
          CBLOW Scout
        </Link>
        {!onLogin && LINKS.map((l) => {
          const active =
            l.href === "/"
              ? pathname === "/" || pathname.startsWith("/times")
              : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                active
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {l.label}
            </Link>
          );
        })}
        {!onLogin && (
          <button
            type="button"
            onClick={signOut}
            className="ml-auto rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Sair
          </button>
        )}
      </nav>
    </header>
  );
}
