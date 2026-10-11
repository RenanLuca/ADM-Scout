"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [{ href: "/", label: "Times" }];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-foreground/10">
      <nav
        aria-label="Principal"
        className="mx-auto flex w-full max-w-5xl items-center gap-1 px-4 py-3 sm:px-6"
      >
        <Link href="/" className="mr-4 font-semibold tracking-tight">
          CBLOW Scout
        </Link>
        {LINKS.map((l) => {
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
      </nav>
    </header>
  );
}
