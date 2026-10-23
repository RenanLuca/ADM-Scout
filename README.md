# CBLOW Scout

Antes de uma partida do CBLOW, veja a rota, o elo e os campeões mais jogados de cada jogador do time adversário.

## Como rodar

```
npm install
npm run dev   # http://localhost:3000
```

Não precisa de chave de API.

## De onde vêm os dados

- **Times, jogadores, rota e Riot ID:** API do próprio cblow.xyz (`api.cblow.xyz`). O Riot ID é extraído do
  link do OP.GG de cada jogador (`.../summoners/br/Nome-TAG` → `Nome#TAG`). Cache de 1h.
- **Elo e campeões:** [servidor MCP público do OP.GG](https://mcp-api.op.gg/mcp), sem chave e sem o limite
  de 100 chamadas/2 min da Riot. Uma chamada por jogador na temporada, duas nas últimas 20 partidas.
  Cache de 30 min por jogador e período.
- **Ícones e nomes dos campeões:** Data Dragon (CDN da Riot).

## Períodos

- **Temporada:** top 5 campeões da temporada ranqueada atual (jogos, winrate, KDA).
- **Últimas 20 partidas:** top 5 campeões nas 20 partidas mais recentes (qualquer fila).

## Correções manuais

Se o link do OP.GG no cblow.xyz não leva à conta certa (ou o jogador mudou de nick), clique no lápis do
card do jogador e informe o Riot ID (`Nome#TAG`). O nick fica na tabela `riot_id_overrides` do banco, pelo
slug do jogador no cblow.xyz, e vale na hora para todas as abas. "Usar link do cblow.xyz" remove o ajuste.

## Fora do MVP

Picks do campeonato (o cblow.xyz não mostra campeões por partida), comparador, IA, filtros extras.

## Nossos Picks

Página `/nossos-picks`: quadro de campeões por jogador do **seu** time (AMIGOS DO MYLENNZY). Cada jogador
tem um quadro por rota que joga; as categorias (Prioridade, Testando…) são criadas por você e valem para o
time todo. Arraste campeões da paleta (filtrável por rota) para as colunas e entre elas; também dá para
mover pelo menu de cada cartão. A tela de escalação mostra os picks de uma formação.

### Banco de dados (Supabase + Prisma)

- Tabelas: `players`, `pick_categories`, `pick_entries` (com RLS ligado, sem policies: só o Prisma acessa).
- `DATABASE_URL`: string de conexão do Supabase (pooler, porta 6543).
- O CLI do Prisma usa a mesma URL trocando a porta para 5432 (modo sessão), veja `prisma.config.ts`.
  Se preferir, defina `DIRECT_URL`.
- Aplicar migrações: `npm run db:migrate` (usa `prisma migrate deploy`, nunca reseta). Ver estado:
  `npm run db:status`.
- O client é gerado em `app/generated/prisma` no `postinstall` (não é versionado).

### Senha do app

`proxy.ts` pede senha em **todas** as páginas e APIs.

- `APP_PASSWORD`: a senha. Defina no `.env.local` e nas variáveis de ambiente da Vercel.
- Sem ela, em desenvolvimento nada é bloqueado; em **produção** tudo fica bloqueado (falha fechada).
- A sessão é um cookie `httpOnly` de 30 dias; trocar a senha encerra todas as sessões.
