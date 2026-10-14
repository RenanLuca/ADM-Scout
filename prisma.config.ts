import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// O Prisma CLI não lê .env.local sozinho (o Next lê em runtime).
config({ path: ".env.local" });
config();

/**
 * URL usada pelos comandos do CLI (migrate, db pull…). O Supabase expõe o pooler
 * em modo transação na porta 6543, que não serve para migrações: nele trocamos
 * para a porta 5432 (modo sessão, mesmo host e credenciais). Em runtime o app
 * usa DATABASE_URL como está.
 *
 * Sem DATABASE_URL (ex.: CI só rodando `prisma generate`) devolve um valor
 * fictício, porque gerar o client não conecta ao banco.
 */
function cliUrl(): string {
  const direct = process.env.DIRECT_URL;
  if (direct) return direct;

  const url = process.env.DATABASE_URL;
  if (!url) return "postgresql://placeholder:placeholder@localhost:5432/placeholder";

  const parsed = new URL(url);
  if (parsed.hostname.endsWith(".pooler.supabase.com") && parsed.port === "6543") {
    parsed.port = "5432";
  }
  return parsed.toString();
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: cliUrl() },
});
