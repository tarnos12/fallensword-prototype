// Grid map (GDD §3, §6.6). map.js is now loader + grid logic only: zone
// definitions (grid size, danger bands, spawn tables, portals) and creatures
// live per-zone under js/zones/ and are composed by the zone registry (task E).
// Zones are connected by portals; danger scales with distance from a zone's
// haven tile; each tile holds 0-3 creatures; cleared tiles repopulate after a
// respawn delay when re-entered.

import { spawnCreature } from './actors.js';
// ZONES is composed from the per-zone modules; re-exported here so every
// existing `import { ZONES } from './map.js'` is unchanged (behaviour-identical).
import { ZONES } from './zones/registry.js';
export { ZONES };

export const RESPAWN_MS = 30_000;

// Movement cost: orthogonal 1 Qi, diagonal 2 Qi (GDD §3).
export function moveCost(from, to) {
  const dx = Math.abs(from.x - to.x);
  const dy = Math.abs(from.y - to.y);
  if (dx > 1 || dy > 1 || (dx === 0 && dy === 0)) return null; // not adjacent
  return dx + dy === 2 ? 2 : 1;
}

function dangerBand(zone, x, y) {
  const d = Math.max(Math.abs(x - zone.start.x), Math.abs(y - zone.start.y));
  for (const b of zone.bands) if (d <= b.max) return b.band;
  return zone.bands[zone.bands.length - 1].band;
}

function pickType(zone, band, rng) {
  const spawns = zone.spawns[band];
  const total = spawns.reduce((s, e) => s + e.weight, 0);
  let roll = rng() * total;
  for (const e of spawns) {
    roll -= e.weight;
    if (roll <= 0) return e.type;
  }
  return spawns[spawns.length - 1].type;
}

function populateTile(zone, tile, rng) {
  const count = tile.isStart ? 0 : Math.floor(rng() * 4); // 0-3 creatures
  tile.monsters = [];
  for (let i = 0; i < count; i++) {
    tile.monsters.push(spawnCreature(pickType(zone, tile.band, rng), null, rng));
  }
  tile.clearedAt = null;
}

function makeMapObject(zoneId, tiles) {
  const size = ZONES[zoneId].size;
  return {
    zoneId,
    size,
    tiles,
    at(x, y) {
      return tiles[y * size + x];
    },
  };
}

export function createZone(zoneId, rng) {
  const zone = ZONES[zoneId];
  const tiles = [];
  for (let y = 0; y < zone.size; y++) {
    for (let x = 0; x < zone.size; x++) {
      const tile = {
        x,
        y,
        band: dangerBand(zone, x, y),
        isStart: x === zone.start.x && y === zone.start.y,
        monsters: [],
        clearedAt: null,
      };
      populateTile(zone, tile, rng);
      tiles.push(tile);
    }
  }
  return makeMapObject(zoneId, tiles);
}

// Rebuild a zone's map object around tiles restored from a save.
export function rehydrateZone(zoneId, tiles) {
  return makeMapObject(zoneId, tiles);
}

export function portalAt(zoneId, x, y) {
  return (ZONES[zoneId].portals || []).find((p) => p.x === x && p.y === y) || null;
}

// Called when the player enters a tile: repopulate if it was cleared long enough ago.
export function maybeRespawn(map, tile, rng, now = Date.now()) {
  if (tile.monsters.length === 0 && tile.clearedAt !== null && now - tile.clearedAt >= RESPAWN_MS) {
    populateTile(ZONES[map.zoneId], tile, rng);
  }
}

export function removeMonster(tile, monsterId, now = Date.now()) {
  tile.monsters = tile.monsters.filter((m) => m.id !== monsterId);
  if (tile.monsters.length === 0) tile.clearedAt = now;
}
