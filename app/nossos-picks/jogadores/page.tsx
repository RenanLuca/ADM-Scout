import type { Metadata } from "next";
import { PlayersScreen } from "@/components/picks/PlayersScreen";

export const metadata: Metadata = { title: "Jogadores · Nossos Picks" };

export default function JogadoresPage() {
  return <PlayersScreen />;
}
