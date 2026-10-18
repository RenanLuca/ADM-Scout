import { TeamList } from "@/components/TeamList";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-[110rem] flex-1 space-y-8 px-4 py-8 sm:px-6 lg:px-10">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Times</h1>
        <p className="text-muted-foreground">
          Escolha o time adversário e veja os campeões mais jogados, rota e elo de cada
          jogador.
        </p>
      </header>
      <TeamList />
    </main>
  );
}
