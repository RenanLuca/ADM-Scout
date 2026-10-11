import Image from "next/image";
import type { ChampionStat } from "@/lib/types";

export function ChampionRow({ champion }: { champion: ChampionStat }) {
  const winrate = Math.round(champion.winrate * 100);

  return (
    <li className="flex items-center gap-3">
      <Image
        src={champion.iconUrl}
        alt=""
        width={36}
        height={36}
        className="size-9 shrink-0 rounded-md ring-1 ring-foreground/10"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{champion.championName}</p>
        <p className="text-xs text-muted-foreground">
          {champion.games} {champion.games === 1 ? "jogo" : "jogos"} ·{" "}
          {champion.wins}V {champion.games - champion.wins}D
        </p>
      </div>
      <div className="text-right text-xs tabular-nums">
        <p
          className={
            winrate >= 50 ? "font-medium text-emerald-400" : "font-medium text-rose-400"
          }
        >
          {winrate}% WR
        </p>
        <p className="text-muted-foreground">{champion.kda.toFixed(2)} KDA</p>
      </div>
    </li>
  );
}
