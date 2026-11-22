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

  it('routes from courtyard spawn to living room art frames, studio/bedroom, and kitchen', () => {
    const isBlocked = makeHouseBlocker();
    const start = { x: domHouseMap.spawn.x, y: domHouseMap.spawn.y };

    // 1. Living Room Gallery north wall frame ("Qua Ô Cửa Sổ" at 10, 2)
    const toFrame = findPath(start, { x: 10, y: 2 }, domHouseMap.width, domHouseMap.height, isBlocked, true);
    expect(toFrame.length).toBeGreaterThan(5);
    expect(toFrame[toFrame.length - 1]).toEqual({ x: 10, y: 3 });

    // 2. Studio & Bedroom waypoints (Dom's desk, bed, gaming corner)
    for (const wpId of ['dom_bed', 'dom_desk', 'dom_game', 'cat_play', 'cat_nap']) {
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

    // 3. Kitchen fridge (26, 11) reachable adjacently
    const toFridge = findPath(start, { x: 26, y: 11 }, domHouseMap.width, domHouseMap.height, isBlocked, true);
    expect(toFridge.length).toBeGreaterThan(5);
  });
});
