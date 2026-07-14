// Grid map (GDD §3, §6.6). map.js is now loader + grid logic only: zone
// definitions (grid size, braid factor, flat spawn table, portals, landmarks)
// and creatures live per-zone under js/zones/ and are composed by the zone
// registry (task E). Zones are connected by portals. There is NO danger
// scaling: every zone spawns its own fixed roster across all its floor tiles.
// What varies a zone is its LAYOUT — a real carved maze of winding corridors.
// Each open tile holds 0-3 creatures; cleared tiles repopulate after a respawn
// delay when re-entered.

import { spawnCreature } from './actors.js';
// ZONES is composed from the per-zone modules; re-exported here so every
// existing `import { ZONES } from './map.js'` is unchanged (behaviour-identical).
import { ZONES } from './zones/registry.js';
export { ZONES };
// Organic rare-spawn economy (Wave 2/3): Legendary + Super-Elite variants of
// native creatures, plus the per-zone move-and-chase Titan. Pure predicates/data.
import { rollLegendary, LEGENDARY_STAT_MULT, anySuperEliteAlive, maybeRollSuperElite, SUPER_ELITE_STAT_MULT } from './rarespawns.js';
import { anyTitanAlive, maybeNaturalTitanSpawn } from './titans.js';

export const RESPAWN_MS = 30_000;

// Movement cost: orthogonal 1 Qi, diagonal 2 Qi (GDD §3).
export function moveCost(from, to) {
  const dx = Math.abs(from.x - to.x);
  const dy = Math.abs(from.y - to.y);
  if (dx > 1 || dy > 1 || (dx === 0 && dy === 0)) return null; // not adjacent
  return dx + dy === 2 ? 2 : 1;
}

// --- Dungeon layout (a real maze) -------------------------------------------
// No danger scaling any more: each zone spawns its OWN fixed roster everywhere
// (js/zones/<id>.js `spawns` is one flat weighted table). What makes a zone
// interesting is its LAYOUT — a proper maze, carved with a randomized
// depth-first "recursive backtracker" over a cell grid (passages 1 tile wide,
// walls 1 tile wide between them), then BRAIDED (dead-ends reopened) so it reads
// as winding corridors with loops instead of a filled square. The haven,
// portals and boss lairs are guaranteed open and reachable.
//
// Cells sit on EVEN coordinates; the odd tiles between them are the walls the
// carver knocks through. Zone `size` should be ODD (e.g. 11) so the far edge
// lands on a cell, not a wasted wall strip.

const DIRS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const CELL_STEPS = [[2, 0], [-2, 0], [0, 2], [0, -2]]; // neighbour cells (2 apart)
const cellKey = (x, y) => `${x},${y}`;
const inBounds = (x, y, size) => x >= 0 && y >= 0 && x < size && y < size;

// Tiles that must never be a wall: the haven, every portal, and any zone
// landmark (boss lairs, declared per-zone in `keepOpen`).
function forcedOpenSet(zone) {
  const s = new Set([cellKey(zone.start.x, zone.start.y)]);
  for (const p of zone.portals || []) s.add(cellKey(p.x, p.y));
  for (const k of zone.keepOpen || []) s.add(cellKey(k.x, k.y));
  return s;
}

// Carve an L-shaped corridor from (x,y) toward the haven, clearing walls — so a
// forced-open landmark (a boss lair on an odd coord, say) always connects to
// the maze without leaving it stranded.
function carveToStart(wall, x, y, start, size) {
  let cx = x, cy = y;
  while (cx !== start.x) { cx += cx < start.x ? 1 : -1; wall[cy * size + cx] = false; }
  while (cy !== start.y) { cy += cy < start.y ? 1 : -1; wall[cy * size + cx] = false; }
}

function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateLayout(zone, rng) {
  const size = zone.size;
  const braid = zone.braid ?? 0.45; // fraction of dead-ends reopened into loops
  const idx = (x, y) => y * size + x;
  const wall = new Array(size * size).fill(true); // start solid; carve passages

  // 1) Recursive backtracker from the (even) haven cell.
  const ox = zone.start.x - (zone.start.x % 2);
  const oy = zone.start.y - (zone.start.y % 2);
  wall[idx(ox, oy)] = false;
  const visited = new Set([cellKey(ox, oy)]);
  const stack = [[ox, oy]];
  while (stack.length) {
    const [cx, cy] = stack[stack.length - 1];
    let advanced = false;
    for (const [dx, dy] of shuffle(CELL_STEPS.slice(), rng)) {
      const nx = cx + dx, ny = cy + dy;
      if (!inBounds(nx, ny, size) || visited.has(cellKey(nx, ny))) continue;
      wall[idx(cx + dx / 2, cy + dy / 2)] = false; // knock the wall between
      wall[idx(nx, ny)] = false;
      visited.add(cellKey(nx, ny));
      stack.push([nx, ny]);
      advanced = true;
      break;
    }
    if (!advanced) stack.pop();
  }

  // 2) Braid: reopen a fraction of dead-end cells so the maze has loops and
  //    alternate routes (less claustrophobic than a perfect maze).
  for (let y = 0; y < size; y += 2) {
    for (let x = 0; x < size; x += 2) {
      if (wall[idx(x, y)]) continue;
      const openN = CELL_STEPS.filter(([dx, dy]) => inBounds(x + dx, y + dy, size) && !wall[idx(x + dx / 2, y + dy / 2)]);
      if (openN.length <= 1 && rng() < braid) {
        const walled = CELL_STEPS.filter(([dx, dy]) => inBounds(x + dx, y + dy, size) && wall[idx(x + dx / 2, y + dy / 2)]);
        if (walled.length) {
          const [dx, dy] = walled[Math.floor(rng() * walled.length)];
          wall[idx(x + dx / 2, y + dy / 2)] = false;
          wall[idx(x + dx, y + dy)] = false;
        }
      }
    }
  }

  // 3) Force landmarks open and connect any stranded one back to the haven.
  const forced = forcedOpenSet(zone);
  for (const fk of forced) {
    const [fx, fy] = fk.split(',').map(Number);
    wall[idx(fx, fy)] = false;
    carveToStart(wall, fx, fy, zone.start, size);
  }

  // 4) Safety net: flood from the haven and seal any tile it never reached.
  const seen = new Array(size * size).fill(false);
  const flood = [idx(zone.start.x, zone.start.y)];
  seen[flood[0]] = true;
  while (flood.length) {
    const i = flood.pop();
    const x = i % size, y = Math.floor(i / size);
    for (const [dx, dy] of DIRS4) {
      const nx = x + dx, ny = y + dy;
      if (!inBounds(nx, ny, size)) continue;
      const ni = idx(nx, ny);
      if (!seen[ni] && !wall[ni]) { seen[ni] = true; flood.push(ni); }
    }
  }
  for (let i = 0; i < size * size; i++) if (!wall[i] && !seen[i]) wall[i] = true;
  return wall;
}

// Weighted pick from the zone's single flat spawn table.
function pickType(zone, rng) {
  const spawns = zone.spawns;
  const total = spawns.reduce((s, e) => s + e.weight, 0);
  let roll = rng() * total;
  for (const e of spawns) {
    roll -= e.weight;
    if (roll <= 0) return e.type;
  }
  return spawns[spawns.length - 1].type;
}

// hasSE / hasTitan: is a Super-Elite / Titan already alive elsewhere in the zone?
// Passed by the caller so the "1 SE / 1 Titan per zone" caps hold across tiles.
function populateTile(zone, tile, rng, hasSE = false, hasTitan = false) {
  tile.monsters = [];
  tile.clearedAt = null;
  if (tile.wall || tile.isStart) return; // walls + the haven never spawn creatures
  const count = Math.floor(rng() * 4); // 0-3 creatures
  for (let i = 0; i < count; i++) {
    // Each ordinary slot independently rolls Legendary (uncapped, ~5%).
    const legendary = rollLegendary(rng);
    tile.monsters.push(
      spawnCreature(pickType(zone, rng), null, rng, legendary ? { legendary: true, statMult: LEGENDARY_STAT_MULT } : undefined)
    );
  }
  // At most one Super-Elite alive per zone.
  if (!hasSE && maybeRollSuperElite(rng)) {
    tile.monsters.push(spawnCreature(pickType(zone, rng), null, rng, { superElite: true, statMult: SUPER_ELITE_STAT_MULT }));
  }
  // At most one Titan alive per zone (rare natural manifestation).
  if (!hasTitan) {
    const t = maybeNaturalTitanSpawn(zone.id, rng);
    if (t) tile.monsters.push(t);
  }
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
  const wall = generateLayout(zone, rng);
  const tiles = [];
  let hasSE = false, hasTitan = false; // enforce the 1-per-zone caps as we fill
  for (let y = 0; y < zone.size; y++) {
    for (let x = 0; x < zone.size; x++) {
      const tile = {
        x,
        y,
        wall: wall[y * zone.size + x],
        isStart: x === zone.start.x && y === zone.start.y,
        monsters: [],
        clearedAt: null,
      };
      populateTile(zone, tile, rng, hasSE, hasTitan);
      hasSE ||= tile.monsters.some((m) => m.isSuperElite);
      hasTitan ||= tile.monsters.some((m) => m.isTitan);
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
    populateTile(ZONES[map.zoneId], tile, rng, anySuperEliteAlive(map.tiles), anyTitanAlive(map.tiles));
  }
}

export function removeMonster(tile, monsterId, now = Date.now()) {
  tile.monsters = tile.monsters.filter((m) => m.id !== monsterId);
  if (tile.monsters.length === 0) tile.clearedAt = now;
}
