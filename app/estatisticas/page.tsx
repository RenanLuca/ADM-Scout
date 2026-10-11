import type { Metadata } from "next";
import { TrainingStatsView } from "@/components/TrainingStatsView";

export const metadata: Metadata = {
  title: "Estatísticas · CBLOW Scout",
};

export default function EstatisticasPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-4 py-8 sm:px-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Estatísticas</h1>
        <p className="text-muted-foreground">
          Treinos entre os times e os campeões que cada jogador usou neles.
        </p>
      </header>
      <TrainingStatsView />
    </main>
  );
}
