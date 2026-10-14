-- Remove o modelo antigo (uma avaliação simples por jogador), criado numa primeira
-- tentativa e substituído por players / pick_categories / pick_entries.
-- A tabela estava vazia. IF EXISTS deixa a migração segura em bancos novos.
DROP TABLE IF EXISTS "champion_ratings";
DROP TYPE IF EXISTS "ChampionLevel";
