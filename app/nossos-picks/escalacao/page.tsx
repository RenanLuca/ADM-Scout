import type { Metadata } from "next";
import { LineupScreen } from "@/components/picks/LineupScreen";

export const metadata: Metadata = { title: "Escalação · Nossos Picks" };

export default function EscalacaoPage() {
  return <LineupScreen />;
}
