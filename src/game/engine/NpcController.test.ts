import { describe, expect, it, vi } from 'vitest';
import { NpcController } from './NpcController';
import { domHouseMap } from '../../data';

const solidTiles = new Set(['.', 'T', 'I', 'W', 'N']);
const isSolid = (x: number, y: number) => {
  if (x < 0 || y < 0 || x >= domHouseMap.width || y >= domHouseMap.height) return true;
  if (solidTiles.has(domHouseMap.tiles[y][x])) return true;
  for (const prop of domHouseMap.props) {
    if (!prop.solid) continue;
    const pw = prop.w || 1;
    const ph = prop.h || 1;
    if (x >= prop.x && x < prop.x + pw && y >= prop.y && y < prop.y + ph) return true;
  }
  return false;
};

const isIndoors = (x: number, y: number) =>
  (domHouseMap.indoorRects || []).some(
    (r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h
  );

describe('NpcController', () => {
  it('moves Dom between desk, bed, and gaming corner based on schedule', () => {
    const ctrl = new NpcController(domHouseMap, 'work', () => 0.5);
    const dom = ctrl.getNpcById('dom')!;
    const ts = domHouseMap.tileSize;

    // Simulate switching to sleep (03:00-09:00)
    for (let i = 0; i < 400; i++) {
      ctrl.update({
        dt: 0.05,
        domActivity: 'sleep',
        playerX: 10 * ts,
        playerY: 21 * ts,
        playerIndoors: false,
        playerIsRunning: false,
        isTileSolidForNpc: isSolid,
        isTileIndoors: isIndoors,
        onCatMeow: () => {},
      });
    }
    const bed = domHouseMap.waypoints!.find((w) => w.id === 'dom_bed')!;
    expect(Math.round(dom.px / ts)).toBe(bed.x);
    expect(Math.round(dom.py / ts)).toBe(bed.y);
    expect(dom.animState).toBe('sleep');

    // Simulate switching to gaming (17:00-03:00)
    for (let i = 0; i < 400; i++) {
      ctrl.update({
        dt: 0.05,
        domActivity: 'gaming',
        playerX: 10 * ts,
        playerY: 21 * ts,
        playerIndoors: false,
        playerIsRunning: false,
        isTileSolidForNpc: isSolid,
        isTileIndoors: isIndoors,
        onCatMeow: () => {},
      });
    }
    const gameSpot = domHouseMap.waypoints!.find((w) => w.id === 'dom_game')!;
    expect(Math.round(dom.px / ts)).toBe(gameSpot.x);
    expect(Math.round(dom.py / ts)).toBe(gameSpot.y);
    expect(dom.animState).toBe('gaming');
  });

  it('makes Cat Ink run to greet, meow, and follow visitor inside the house without blocking', () => {
    const ctrl = new NpcController(domHouseMap, 'gaming', () => 0.5);
    const cat = ctrl.getNpcById('ink_cat')!;
    const ts = domHouseMap.tileSize;
    const onMeow = vi.fn();

    expect(cat.blocksPlayer).toBe(false);
    expect(cat.catState).toBe('roaming');

    // Visitor steps inside the living room doorway (11, 13)
    for (let i = 0; i < 160; i++) {
      ctrl.update({
        dt: 0.05,
        domActivity: 'gaming',
        playerX: 11 * ts,
        playerY: 13 * ts,
        playerIndoors: true,
        playerIsRunning: false,
        isTileSolidForNpc: isSolid,
        isTileIndoors: isIndoors,
        onCatMeow: onMeow,
      });
    }

    expect(onMeow).toHaveBeenCalledTimes(1);
    expect(cat.catState).toBe('following');

    // Visitor walks back outside -> Cat returns to roaming inside
    ctrl.update({
      dt: 0.05,
      domActivity: 'gaming',
      playerX: 11 * ts,
      playerY: 20 * ts,
      playerIndoors: false,
      playerIsRunning: false,
      isTileSolidForNpc: isSolid,
      isTileIndoors: isIndoors,
      onCatMeow: onMeow,
    });
    expect(cat.catState).toBe('roaming');
  });

  it('triggers random Dom + Cat playtime during work hours and keeps Cat with Dom', () => {
    const ctrl = new NpcController(domHouseMap, 'work', () => 0.2);
    const dom = ctrl.getNpcById('dom')!;
    const cat = ctrl.getNpcById('ink_cat')!;
    const ts = domHouseMap.tileSize;

    // Fast-forward past initial 16s playtime cooldown
    for (let i = 0; i < 360; i++) {
      ctrl.update({
        dt: 0.05,
        domActivity: 'work',
        playerX: 10 * ts,
        playerY: 21 * ts,
        playerIndoors: false,
        playerIsRunning: false,
        isTileSolidForNpc: isSolid,
        isTileIndoors: isIndoors,
        onCatMeow: () => {},
      });
    }

    expect(dom.domActivity).toBe('play_cat');
    expect(cat.catState).toBe('playing_with_dom');

    // Even if visitor enters while Dom is playing with Cat, Cat stays with Dom first
    ctrl.update({
      dt: 0.05,
      domActivity: 'work',
      playerX: 10 * ts,
      playerY: 14 * ts,
      playerIndoors: true,
      playerIsRunning: false,
      isTileSolidForNpc: isSolid,
      isTileIndoors: isIndoors,
      onCatMeow: () => {},
    });
    expect(cat.catState).toBe('playing_with_dom');
  });
});
