// Grid map (GDD §3, §6.6). Multiple named zones, each with its own grid,
// danger bands, and spawn table. Zones are connected by portals. Danger
// scales with distance from a zone's haven tile; each tile holds 0-3
// creatures; cleared tiles repopulate after a respawn delay when re-entered.

import { spawnCreature } from './actors.js';

export const RESPAWN_MS = 30_000;

// Zone definitions. `start` is the safe haven (no spawns, offers services);
// `bands` map Chebyshev distance from the haven to a danger tier; `portals`
// connect zones (looked up by position, not stored per-tile, so saves stay
// small and new portals apply to old saves automatically).
export const ZONES = {
  azuremist: {
    id: 'azuremist',
    name: 'Azuremist Vale',
    size: 10,
    realm: 'Qi Condensation',
    start: { x: 0, y: 0 },
    startLabel: 'Sect Gate',
    bands: [
      { max: 3, band: 1 },
      { max: 6, band: 2 },
      { max: Infinity, band: 3 },
    ],
    spawns: {
      1: [{ type: 'wolfSpirit', weight: 1 }],
      2: [
        { type: 'wolfSpirit', weight: 1 },
        { type: 'boneSerpent', weight: 2 },
      ],
      3: [
        { type: 'boneSerpent', weight: 1 },
        { type: 'rogueCultivator', weight: 2 },
      ],
    },
    portals: [
      { x: 9, y: 9, to: 'cindervein', entryX: 0, entryY: 0, minStage: 4 },
    ],
  },
  cindervein: {
    id: 'cindervein',
    name: 'Cindervein Gorge',
    size: 10,
    realm: 'Foundation Establishment',
    start: { x: 0, y: 0 },
    startLabel: 'Gorge Outpost',
    bands: [
      { max: 3, band: 1 },
      { max: 6, band: 2 },
      { max: Infinity, band: 3 },
    ],
    spawns: {
      1: [{ type: 'emberHound', weight: 1 }],
      2: [
        { type: 'emberHound', weight: 1 },
        { type: 'cinderGolem', weight: 2 },
      ],
      3: [
        { type: 'cinderGolem', weight: 1 },
        { type: 'ashenRevenant', weight: 2 },
      ],
    },
    portals: [
      { x: 0, y: 0, to: 'azuremist', entryX: 9, entryY: 9, minStage: 0 },
    ],
  },
};

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
