import { describe, expect, it } from 'vitest';
import { findPath } from './Pathfinder';
import { domHouseMap } from '../../data';

function makeHouseBlocker() {
  const solidTiles = new Set(['.', 'T', 'I', 'W', 'N']);
  return (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= domHouseMap.width || y >= domHouseMap.height) return true;
    if (solidTiles.has(domHouseMap.tiles[y][x])) return true;
    for (const prop of domHouseMap.props) {
      if (!prop.solid) continue;
      const pw = prop.w || 1;
      const ph = prop.h || 1;
      if (x >= prop.x && x < prop.x + pw && y >= prop.y && y < prop.y + ph) return true;
    }
    for (const npc of domHouseMap.npcs) {
      if ((npc.aiRole || 'static') !== 'static') continue;
      if (npc.x === x && npc.y === y) return true;
    }
    return false;
  };
}

describe('Pathfinder', () => {
  it('routes around solid obstacles to a walkable goal', () => {
    const blocked = new Set(['1,0', '1,1']);
    const path = findPath(
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      4,
      4,
      (x, y) => blocked.has(`${x},${y}`)
    );
    expect(path.length).toBeGreaterThan(2);
    expect(path[path.length - 1]).toEqual({ x: 2, y: 0 });
    expect(path.some((p) => blocked.has(`${p.x},${p.y}`))).toBe(false);
  });

  it('routes from garden trailhead spawn through tree avenue to gallery frames, kitchen, studio/bedroom, and town gate', () => {
    const isBlocked = makeHouseBlocker();
    const start = { x: domHouseMap.spawn.x, y: domHouseMap.spawn.y };

    // 1. Living Room Gallery north wall frame ("Qua Ô Cửa Sổ" at 11, 4)
    const toFrame = findPath(start, { x: 11, y: 4 }, domHouseMap.width, domHouseMap.height, isBlocked, true);
    expect(toFrame.length).toBeGreaterThan(10);
    expect(toFrame[toFrame.length - 1]).toEqual({ x: 11, y: 5 });

    // 2. All Studio, Bedroom & Kitchen NPC waypoints (dom_bed, dom_desk, dom_game, cat_play, cat_nap)
    for (const wpId of ['dom_bed', 'dom_desk', 'dom_game', 'cat_play', 'cat_nap', 'door_entry']) {
      const wp = domHouseMap.waypoints?.find((w) => w.id === wpId);
      expect(wp, `Missing waypoint ${wpId}`).toBeDefined();
      const route = findPath(
        start,
        { x: wp!.x, y: wp!.y },
        domHouseMap.width,
        domHouseMap.height,
        isBlocked,
        false
      );
      expect(route.length, `Unreachable waypoint ${wpId}`).toBeGreaterThan(0);
      expect(route[route.length - 1]).toEqual({ x: wp!.x, y: wp!.y });
    }

    // 3. Kitchen cooking station (22, 7) & East town gate (40, 23) reachable adjacently
    const toKitchen = findPath(start, { x: 22, y: 7 }, domHouseMap.width, domHouseMap.height, isBlocked, true);
    expect(toKitchen.length).toBeGreaterThan(10);

    const toGate = findPath(start, { x: 40, y: 23 }, domHouseMap.width, domHouseMap.height, isBlocked, true);
    expect(toGate.length).toBeGreaterThan(10);
  });
});
