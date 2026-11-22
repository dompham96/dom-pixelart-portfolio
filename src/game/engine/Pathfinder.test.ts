import { describe, expect, it } from 'vitest';
import { findPath } from './Pathfinder';
import { domHouseMap } from '../../data';

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

  it('routes from front walkway spawn right up to an interior wall art frame', () => {
    const solidTiles = new Set(['.', 'T', 'I', 'W', 'N']);
    const isBlocked = (x: number, y: number) => {
      if (solidTiles.has(domHouseMap.tiles[y][x])) return true;
      for (const prop of domHouseMap.props) {
        if (!prop.solid) continue;
        const pw = prop.w || 1;
        const ph = prop.h || 1;
        if (x >= prop.x && x < prop.x + pw && y >= prop.y && y < prop.y + ph) return true;
      }
      for (const npc of domHouseMap.npcs) {
        if (npc.x === x && npc.y === y) return true;
      }
      return false;
    };

    // Frame "The Mâm-ment" sits on the North interior wall at (10, 2)
    const path = findPath(
      { x: domHouseMap.spawn.x, y: domHouseMap.spawn.y },
      { x: 10, y: 2 },
      domHouseMap.width,
      domHouseMap.height,
      isBlocked,
      true
    );

    expect(path.length).toBeGreaterThan(5);
    expect(path[path.length - 1]).toEqual({ x: 10, y: 3 });
  });
});
