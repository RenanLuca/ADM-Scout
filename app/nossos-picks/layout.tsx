import { PicksNav } from "@/components/picks/PicksNav";
import { SaveIndicator } from "@/components/picks/SaveIndicator";
import { MY_TEAM } from "@/lib/my-team";

/** Moldura das telas de Nossos Picks: mais larga que o scout, com a navegação entre etapas. */
export default function NossosPicksLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-[110rem] flex-1 space-y-6 px-4 py-8 sm:px-6 lg:px-10">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Nossos Picks</h1>
          <p className="text-muted-foreground">
            {MY_TEAM.name}: cadastre os jogadores, monte o pool de campeões de cada rota e confira
            os picks da escalação.
          </p>
        </div>
        <SaveIndicator />
      </header>
      <PicksNav />
      {children}
    </main>
  );
}
