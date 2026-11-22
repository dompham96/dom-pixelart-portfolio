import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd(), 'src/data');
const readJson = (relPath) => JSON.parse(readFileSync(resolve(root, relPath), 'utf8'));

const errors = [];

const checkLocalized = (val, label) => {
  if (!val || typeof val.vi !== 'string' || !val.vi.trim() || typeof val.en !== 'string' || !val.en.trim()) {
    errors.push(`Missing vi/en localized text at ${label}`);
  }
};

const site = readJson('site.json');
const artworks = readJson('artworks.json');
const merch = readJson('merch.json');
const map = readJson('maps/dom-house.json');
const seasonFiles = ['seasons/default.json', 'seasons/trung-thu.json', 'seasons/tet.json'];

checkLocalized(site.tagline, 'site.tagline');
checkLocalized(site.heroGreeting, 'site.heroGreeting');
checkLocalized(site.contactMessage, 'site.contactMessage');

const collectionIds = new Set();
const merchIds = new Set(merch.map((m) => m.id));

for (const col of artworks) {
  if (collectionIds.has(col.id)) errors.push(`Duplicate collection id: ${col.id}`);
  collectionIds.add(col.id);
  checkLocalized(col.title, `artworks[${col.id}].title`);
  checkLocalized(col.subtitle, `artworks[${col.id}].subtitle`);
  if (!Array.isArray(col.items) || col.items.length === 0) {
    errors.push(`Collection ${col.id} must have at least 1 item`);
  }
  for (const item of col.items || []) {
    checkLocalized(item.title, `artworks[${col.id}].items[${item.id}].title`);
    if (item.merchId && !merchIds.has(item.merchId)) {
      errors.push(`Artwork item ${item.id} references unknown merchId: ${item.merchId}`);
    }
  }
}

for (const m of merch) {
  checkLocalized(m.title, `merch[${m.id}].title`);
  if (!collectionIds.has(m.collectionId)) {
    errors.push(`Merch ${m.id} references unknown collectionId: ${m.collectionId}`);
  }
}

if (map.tiles.length !== map.height) {
  errors.push(`Map ${map.id} height mismatch: expected ${map.height}, got ${map.tiles.length}`);
}
for (let y = 0; y < map.tiles.length; y++) {
  if (map.tiles[y].length !== map.width) {
    errors.push(`Map ${map.id} row ${y} width mismatch: expected ${map.width}, got ${map.tiles[y].length}`);
  }
}

const validateProps = (props, sourceName) => {
  for (const prop of props) {
    if (prop.x < 0 || prop.x >= map.width || prop.y < 0 || prop.y >= map.height) {
      errors.push(`${sourceName} prop ${prop.id} out of map bounds (${prop.x},${prop.y})`);
    }
    if (prop.action?.type === 'artwork' && !collectionIds.has(prop.action.collectionId)) {
      errors.push(`${sourceName} prop ${prop.id} references unknown collectionId: ${prop.action.collectionId}`);
    }
  }
};

validateProps(map.props, 'map');

for (const rect of map.indoorRects || []) {
  if (rect.x < 0 || rect.y < 0 || rect.x + rect.w > map.width || rect.y + rect.h > map.height) {
    errors.push(`Map indoorRect out of bounds: (${rect.x},${rect.y},${rect.w},${rect.h})`);
  }
}

for (const zone of map.zones || []) {
  checkLocalized(zone.name, `map.zones[${zone.id}].name`);
  if (zone.x < 0 || zone.y < 0 || zone.x + zone.w > map.width || zone.y + zone.h > map.height) {
    errors.push(`Map zone ${zone.id} out of bounds`);
  }
}

for (const wp of map.waypoints || []) {
  if (wp.x < 0 || wp.x >= map.width || wp.y < 0 || wp.y >= map.height) {
    errors.push(`Map waypoint ${wp.id} out of bounds (${wp.x},${wp.y})`);
  }
}

for (const light of map.lights || []) {
  if (light.x < 0 || light.x > map.width || light.y < 0 || light.y > map.height) {
    errors.push(`Map light out of bounds (${light.x},${light.y})`);
  }
}

const npcIds = new Set(map.npcs.map((n) => n.id));
for (const npc of map.npcs) {
  checkLocalized(npc.name, `npc[${npc.id}].name`);
  if (npc.actionButton?.actionType === 'artwork' && !collectionIds.has(npc.actionButton.collectionId)) {
    errors.push(`NPC ${npc.id} references unknown collectionId: ${npc.actionButton.collectionId}`);
  }
}

for (const sf of seasonFiles) {
  const s = readJson(sf);
  checkLocalized(s.name, `${sf}.name`);
  validateProps(s.extraProps || [], sf);
  for (const npcId of Object.keys(s.npcDialogueOverrides || {})) {
    if (!npcIds.has(npcId)) {
      errors.push(`${sf} overrides dialogue for unknown NPC: ${npcId}`);
    }
  }
}

if (errors.length > 0) {
  console.error('❌ Data validation failed:\n' + errors.map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}

console.log(
  `✅ Data validation passed: ${artworks.length} collections, ${merch.length} merch items, ${map.width}x${map.height} map, ${seasonFiles.length} seasons.`
);
