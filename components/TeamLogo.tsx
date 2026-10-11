"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

/** Logo do time, hospedado pelo próprio cblow.xyz (WebP 256×256). */
export function teamLogoUrl(slug: string): string {
  return `https://cblow.xyz/times/${slug}.webp`;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function TeamLogo({
  slug,
  name,
  size = 40,
  className,
}: {
  slug: string;
  name: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        aria-hidden
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground",
          className,
        )}
        style={{ width: size, height: size }}
      >
        {initials(name) || "?"}
      </span>
    );
  }

  return (
    <Image
      src={teamLogoUrl(slug)}
      alt={`Logo ${name}`}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className={cn("shrink-0 rounded-lg object-cover", className)}
      style={{ width: size, height: size }}
    />
  );
}
