// Grid map (GDD §3, §6.6). Stage 0: one 10x10 zone. Danger scales with
// distance from the starting tile; each tile holds 0-3 creatures. Cleared
// tiles repopulate after a respawn delay when re-entered.

import { spawnCreature } from './actors.js';

export const MAP_SIZE = 10;
export const RESPAWN_MS = 30_000;

// Movement cost: orthogonal 1 Qi, diagonal 2 Qi (GDD §3).
export function moveCost(from, to) {
  const dx = Math.abs(from.x - to.x);
  const dy = Math.abs(from.y - to.y);
  if (dx > 1 || dy > 1 || (dx === 0 && dy === 0)) return null; // not adjacent
  return dx + dy === 2 ? 2 : 1;
}

// Danger band by Chebyshev distance from the start tile at (0,0).
function dangerBand(x, y) {
  const d = Math.max(x, y);
  if (d <= 3) return 1;
  if (d <= 6) return 2;
  return 3;
}

const BAND_SPAWNS = {
  1: [{ type: 'wolfSpirit', weight: 1 }],
  2: [
    { type: 'wolfSpirit', weight: 1 },
    { type: 'boneSerpent', weight: 2 },
  ],
  3: [
    { type: 'boneSerpent', weight: 1 },
    { type: 'rogueCultivator', weight: 2 },
  ],
};

function pickType(band, rng) {
  const spawns = BAND_SPAWNS[band];
  const total = spawns.reduce((s, e) => s + e.weight, 0);
  let roll = rng() * total;
  for (const e of spawns) {
    roll -= e.weight;
    if (roll <= 0) return e.type;
  }
  return spawns[spawns.length - 1].type;
}

function populateTile(tile, rng) {
  const count = tile.isStart ? 0 : Math.floor(rng() * 4); // 0-3 creatures
  tile.monsters = [];
  for (let i = 0; i < count; i++) {
    tile.monsters.push(spawnCreature(pickType(tile.band, rng), null, rng));
  }
  tile.clearedAt = null;
}

export function createMap(rng) {
  const tiles = [];
  for (let y = 0; y < MAP_SIZE; y++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      const tile = {
        x,
        y,
        band: dangerBand(x, y),
        isStart: x === 0 && y === 0,
        monsters: [],
        clearedAt: null,
      };
      populateTile(tile, rng);
      tiles.push(tile);
    }
  }
  return {
    tiles,
    at(x, y) {
      return tiles[y * MAP_SIZE + x];
    },
  };
}

// Called when the player enters a tile: repopulate if it was cleared long enough ago.
export function maybeRespawn(tile, rng, now = Date.now()) {
  if (tile.monsters.length === 0 && tile.clearedAt !== null && now - tile.clearedAt >= RESPAWN_MS) {
    populateTile(tile, rng);
  }
}

export function removeMonster(tile, monsterId, now = Date.now()) {
  tile.monsters = tile.monsters.filter((m) => m.id !== monsterId);
  if (tile.monsters.length === 0) tile.clearedAt = now;
}
