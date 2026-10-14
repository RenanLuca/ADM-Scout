-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Lane" AS ENUM ('TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT');

-- CreateTable
CREATE TABLE "players" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "cblow_slug" TEXT,
    "lanes" "Lane"[],
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pick_categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'slate',
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pick_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pick_entries" (
    "id" SERIAL NOT NULL,
    "player_id" INTEGER NOT NULL,
    "lane" "Lane" NOT NULL,
    "champion_id" TEXT NOT NULL,
    "category_id" INTEGER NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pick_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pick_entries_category_id_idx" ON "pick_entries"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "pick_entries_player_id_lane_champion_id_key" ON "pick_entries"("player_id", "lane", "champion_id");

-- AddForeignKey
ALTER TABLE "pick_entries" ADD CONSTRAINT "pick_entries_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pick_entries" ADD CONSTRAINT "pick_entries_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "pick_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- O Supabase expõe o schema public pela API REST (PostgREST). Sem RLS, qualquer
-- pessoa com a chave anon leria/escreveria nestas tabelas. Com RLS ligado e sem
-- policies a API pública fica sem acesso; o Prisma conecta como `postgres` e
-- ignora o RLS.
ALTER TABLE "players" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pick_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pick_entries" ENABLE ROW LEVEL SECURITY;
