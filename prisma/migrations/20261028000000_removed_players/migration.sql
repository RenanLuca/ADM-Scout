-- CreateTable
CREATE TABLE "removed_players" (
    "player_slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "removed_players_pkey" PRIMARY KEY ("player_slug")
);
