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

Se o link do OP.GG no cblow.xyz não leva à conta certa, corrija em [`data/riot-ids.json`](data/riot-ids.json),
pelo slug do jogador (final de `/jogadores/<slug>`):

```json
{ "exc4mbau": "ExC4mBau#6344" }
```

## Fora do MVP

Picks do campeonato (o cblow.xyz não mostra campeões por partida), comparador, IA, filtros extras.
