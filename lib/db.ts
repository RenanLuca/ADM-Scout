import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Client do Prisma (Supabase). Criado sob demanda para o build não exigir
 * `DATABASE_URL`, e reaproveitado entre recarregamentos do dev server.
 *
 * `DATABASE_URL` aponta para o pooler do Supabase (porta 6543, modo transação).
 */
export function getDb(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL não configurada");

  const client = new PrismaClient({
    adapter: new PrismaPg({ connectionString, max: 5 }),
  });
  globalForPrisma.prisma = client;
  return client;
}
