// Titan world-state (Wave 2, doc 40 §3) — Systems, single-owner. Author
// directive: a solo "move-and-chase" world boss. One hand-authored Titan per
// zone, same authoring discipline as boss.js's calamities: fixed stats,
// headless-tuned via tools/balance.mjs.
//
// THE PURITY SHAPE (critique §3a, verified): a Titan's HP is NOT the transient
// combat.js `hp` field — it's a persisted WORLD pool (`titanHp`) that depletes
// ACROSS repeated resolveCombat calls instead of resetting each fight. game.js
// syncs monster.hp = monster.titanHp immediately BEFORE the one resolveCombat
// call, reads the ending HP back off the existing return shape
// (result.turns[last].defenderHpAfter) AFTER it, subtracts into titanHp, then
// relocates the Titan. combat.js is never told a Titan exists and is untouched.
//
// This module owns ONLY world-state: authoring, spawning, and relocation. It
// grants no rewards itself (game.js's attack() win branch does that, once, on
// the depleting encounter). Pure of DOM; imports only actors.js — no cycle.
import { createActor } from './actors.js';

// worldMaxHp is authored so an average encounter (a geared player at the zone's
// gate level, per tools/balance.mjs) chips off ~1/10th — empirically ~10
// encounters, not a hardcoded counter. Tune worldMaxHp here.
export const TITANS = {
  azuremist:   { zoneId: 'azuremist',   name: 'Ashen Colossus',     level: 6,  stats: { attack: 18,  defense: 22, damage: 10, armor: 14 }, worldMaxHp: 900,   dropLevel: 6,  reward: { xp: 350,   stones: 220 } },
  cindervein:  { zoneId: 'cindervein',  name: 'Cinderforge Titan',  level: 16, stats: { attack: 55,  defense: 60, damage: 34, armor: 40 }, worldMaxHp: 5200,  dropLevel: 16, reward: { xp: 3800,  stones: 2200 } },
  thunderpeak: { zoneId: 'thunderpeak', name: 'Stormwrought Titan', level: 26, stats: { attack: 100, defense: 95, damage: 62, armor: 58 }, worldMaxHp: 14000, dropLevel: 26, reward: { xp: 13000, stones: 5800 } },
};

// Zone-wide predicate: is a Titan already alive anywhere on the grid?
export function anyTitanAlive(tiles) {
  return tiles.some((t) => t.monsters.some((m) => m.isTitan));
}

// Mint a Titan Actor for a zone (null if the zone has no Titan). Its combat
// stats are fixed; its maxHp/hp seed from worldMaxHp, but the depleting pool is
// the separate persisted `titanHp` — hp is only what combat.js reads per fight.
export function spawnTitanActor(zoneId) {
  const t = TITANS[zoneId];
  if (!t) return null;
  const actor = createActor({
    id: `titan-${zoneId}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    name: t.name,
    level: t.level,
    attack: t.stats.attack,
    defense: t.stats.defense,
    damage: t.stats.damage,
    armor: t.stats.armor,
    maxHp: t.worldMaxHp,
  });
  actor.typeId = `titan_${zoneId}`; // synthetic — NOT a real CREATURE_TYPES key
  actor.isTitan = true;
  actor.tier = 'titan'; // external consumers (Economy's Merit hook) check this
  actor.titanHp = t.worldMaxHp;    // persisted; depletes across encounters, never resets
  actor.titanMaxHp = t.worldMaxHp;
  actor.dropLevel = t.dropLevel;
  actor.xpReward = t.reward.xp;    // paid out once, on the depleting encounter
  actor.stoneReward = t.reward.stones;
  return actor;
}

// Place (or relocate) a Titan onto a random non-start tile, excluding its
// current cell — "moves to a DIFFERENT cell" is enforced here, not left to chance.
export function placeTitanRandomly(map, actor, rng, excludeXY) {
  const pool = map.tiles.filter((t) => !t.isStart && !(excludeXY && t.x === excludeXY.x && t.y === excludeXY.y));
  const tiles = pool.length ? pool : map.tiles.filter((t) => !t.isStart);
  const tile = tiles[Math.floor(rng() * tiles.length)];
  tile.monsters.push(actor);
  tile.clearedAt = null;
  return { x: tile.x, y: tile.y };
}

// Remove the Titan from its current tile and drop it on a new one. The old tile
// is never marked "cleared" mid-chase — the Titan is still out there.
export function relocateTitan(map, tile, actor, rng) {
  tile.monsters = tile.monsters.filter((m) => m.id !== actor.id);
  if (tile.monsters.length === 0) tile.clearedAt = null;
  return placeTitanRandomly(map, actor, rng, { x: tile.x, y: tile.y });
}

// Natural (non-debug) manifestation: rare, capped at 1 alive/zone (map.js checks
// anyTitanAlive before calling). Debug spawns (debug.js → game.js) bypass this.
export const NATURAL_SPAWN_CHANCE = 0.004;
export function maybeNaturalTitanSpawn(zoneId, rng) {
  if (!TITANS[zoneId] || rng() >= NATURAL_SPAWN_CHANCE) return null;
  return spawnTitanActor(zoneId);
}
