import { getDb } from "./db";
import { MY_TEAM } from "./my-team";
import {
  isCategoryColor,
  type PickCategory,
  type PickEntry,
  type PickPlayer,
  type PicksData,
} from "./picks";

export async function loadPicks(): Promise<PicksData> {
  const db = getDb();
  const [players, categories, entries] = await Promise.all([
    db.player.findMany({ orderBy: [{ position: "asc" }, { id: "asc" }] }),
    db.pickCategory.findMany({ orderBy: [{ position: "asc" }, { id: "asc" }] }),
    db.pickEntry.findMany({ orderBy: [{ categoryId: "asc" }, { position: "asc" }] }),
  ]);

  return {
    team: { slug: MY_TEAM.slug, name: MY_TEAM.name },
    players: players.map(
      (p): PickPlayer => ({
        id: p.id,
        name: p.name,
        lanes: p.lanes,
        position: p.position,
      }),
    ),
    categories: categories.map(
      (c): PickCategory => ({
        id: c.id,
        name: c.name,
        color: isCategoryColor(c.color) ? c.color : "slate",
        position: c.position,
      }),
    ),
    entries: entries.map(
      (e): PickEntry => ({
        id: e.id,
        playerId: e.playerId,
        lane: e.lane,
        championId: e.championId,
        categoryId: e.categoryId,
        position: e.position,
      }),
    ),
  };
}
