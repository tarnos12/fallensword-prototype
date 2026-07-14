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

// --- Dungeon layout (rooms & corridors) -------------------------------------
// No danger scaling: each zone spawns its OWN fixed roster everywhere (js/zones/
// <id>.js `spawns` is one flat weighted table). What varies a zone is its
// LAYOUT and SIZE — a classic roguelike dungeon of open ROOMS joined by
// corridors, carved out of solid rock. Zones are large (see each zone's `size`,
// from ~15 up toward 100); the player only ever sees a fixed camera window
// (ui.js renderMap), so a big zone reads as a world to explore. The haven,
// every portal and every boss lair sits in its own room and is guaranteed
// reachable from the start.

const DIRS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const cellKey = (x, y) => `${x},${y}`;
const inBounds = (x, y, size) => x >= 0 && y >= 0 && x < size && y < size;

// Tiles that must anchor a room (never sealed): the haven, every portal, and any
// zone landmark (boss lairs, declared per-zone in `keepOpen`).
function forcedOpenSet(zone) {
  const s = new Set([cellKey(zone.start.x, zone.start.y)]);
  for (const p of zone.portals || []) s.add(cellKey(p.x, p.y));
  for (const k of zone.keepOpen || []) s.add(cellKey(k.x, k.y));
  return s;
}

// Carve an L-shaped corridor from (x,y) toward the haven, clearing walls — a
// safety tether so a forced landmark can never end up stranded.
function carveToStart(wall, x, y, start, size) {
  let cx = x, cy = y;
  while (cx !== start.x) { cx += cx < start.x ? 1 : -1; wall[cy * size + cx] = false; }
  while (cy !== start.y) { cy += cy < start.y ? 1 : -1; wall[cy * size + cx] = false; }
}

function carveRect(wall, size, x0, y0, w, h) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      if (inBounds(x, y, size)) wall[y * size + x] = false;
    }
  }
}

// Carve an L-shaped (optionally 2-wide) corridor between two room centres.
function carveCorridor(wall, size, ax, ay, bx, by, rng, wide) {
  const open = (x, y) => {
    if (inBounds(x, y, size)) wall[y * size + x] = false;
    if (wide && inBounds(x + 1, y, size)) wall[y * size + (x + 1)] = false;
  };
  let x = ax, y = ay;
  if (rng() < 0.5) {
    while (x !== bx) { x += x < bx ? 1 : -1; open(x, y); }
    while (y !== by) { y += y < by ? 1 : -1; open(x, y); }
  } else {
    while (y !== by) { y += y < by ? 1 : -1; open(x, y); }
    while (x !== bx) { x += x < bx ? 1 : -1; open(x, y); }
  }
}

function makeRoom(size, cx, cy, minR, maxR, rng) {
  const w = minR + Math.floor(rng() * (maxR - minR + 1));
  const h = minR + Math.floor(rng() * (maxR - minR + 1));
  const x0 = Math.max(0, Math.min(cx - (w >> 1), size - w));
  const y0 = Math.max(0, Math.min(cy - (h >> 1), size - h));
  return { x0, y0, w, h, cx: x0 + (w >> 1), cy: y0 + (h >> 1) };
}

function overlaps(a, b) {
  return a.x0 < b.x0 + b.w + 1 && a.x0 + a.w + 1 > b.x0 && a.y0 < b.y0 + b.h + 1 && a.y0 + a.h + 1 > b.y0;
}

function generateLayout(zone, rng) {
  const size = zone.size;
  const minR = zone.roomMin ?? 3;
  const maxR = zone.roomMax ?? 6;
  const idx = (x, y) => y * size + x;
  const wall = new Array(size * size).fill(true); // solid rock; carve rooms + halls
  const rooms = [];

  // 1) Anchor a room on every forced landmark first, chained together so they
  //    always connect, and pin the exact landmark tile open.
  for (const fk of forcedOpenSet(zone)) {
    const [fx, fy] = fk.split(',').map(Number);
    const room = makeRoom(size, fx, fy, minR, maxR, rng);
    carveRect(wall, size, room.x0, room.y0, room.w, room.h);
    wall[idx(fx, fy)] = false;
    if (rooms.length) carveCorridor(wall, size, room.cx, room.cy, rooms[rooms.length - 1].cx, rooms[rooms.length - 1].cy, rng, true);
    rooms.push(room);
  }

  // 2) Scatter random rooms, each joined by a corridor to the nearest existing
  //    room (so the dungeon stays one connected whole as it grows).
  const target = Math.max(rooms.length + 4, Math.round((size * size) / (zone.roomSpacing ?? 22)));
  let attempts = 0;
  while (rooms.length < target && attempts < target * 10) {
    attempts++;
    const w = minR + Math.floor(rng() * (maxR - minR + 1));
    const h = minR + Math.floor(rng() * (maxR - minR + 1));
    const x0 = Math.floor(rng() * (size - w));
    const y0 = Math.floor(rng() * (size - h));
    const room = { x0, y0, w, h, cx: x0 + (w >> 1), cy: y0 + (h >> 1) };
    if (rooms.some((r) => overlaps(room, r))) continue;
    carveRect(wall, size, x0, y0, w, h);
    let nearest = rooms[0], nd = Infinity;
    for (const r of rooms) {
      const d = Math.abs(r.cx - room.cx) + Math.abs(r.cy - room.cy);
      if (d < nd) { nd = d; nearest = r; }
    }
    carveCorridor(wall, size, room.cx, room.cy, nearest.cx, nearest.cy, rng, rng() < 0.35);
    rooms.push(room);
  }

  // 3) Tether every forced landmark straight to the haven as a hard guarantee.
  for (const fk of forcedOpenSet(zone)) {
    const [fx, fy] = fk.split(',').map(Number);
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
  // Sparse population — most tiles are empty ground to cross; big zones would be
  // wall-to-wall monsters otherwise. Weighted 0-3, averaging ~0.6 per open tile.
  const roll = rng();
  const count = roll < 0.55 ? 0 : roll < 0.85 ? 1 : roll < 0.97 ? 2 : 3;
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
