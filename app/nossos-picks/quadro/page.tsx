import type { Metadata } from "next";
import { Suspense } from "react";
import { BoardScreen } from "@/components/picks/BoardScreen";
import { BoardSkeleton } from "@/components/Skeletons";

export const metadata: Metadata = { title: "Quadro de campeões · Nossos Picks" };

export default function QuadroPage() {
  // useSearchParams (seleção de jogador e rota na URL) exige Suspense.
  return (
    <Suspense fallback={<BoardSkeleton />}>
      <BoardScreen />
    </Suspense>
  );
}
