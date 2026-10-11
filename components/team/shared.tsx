import Image from "next/image";
import type { ChampionRef, Role } from "@/lib/types";

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
}: {
  champion: Pick<ChampionRef, "name" | "iconUrl">;
  size?: number;
}) {
  return (
    <Image
      src={champion.iconUrl}
      alt={champion.name}
      title={champion.name}
      width={size}
      height={size}
      className="shrink-0 rounded-md ring-1 ring-foreground/10"
      style={{ width: size, height: size }}
    />
  );
}
