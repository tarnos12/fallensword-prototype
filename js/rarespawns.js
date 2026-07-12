// Rare-spawn economy (Wave 2, doc 40 §2) — Systems, single-owner. Owns the
// Legendary / Super-Elite rarity economy for ORDINARY zone creatures. Legendary
// and Super-Elite monsters are the SAME native creature (same typeId), just
// stat-multiplied and flagged via actors.js spawnCreature's opts bag — NOT new
// entities. That keeps cards.js (Spirit Card drops key off typeId), the Beast
// Codex (ensureSeen/markSeen, keyed off typeId), and Quests.onFace/onKill working
// with zero changes: a Legendary Wolf Spirit still counts as a Wolf Spirit.
//
// This module is pure data + pure predicates (no DOM, no game-state mutation), so
// map.js can import it into createZone/populateTile/maybeRespawn and headless
// sims can import it safely. It imports nothing game-side — no cycle.

// Legendary: an independent roll PER monster slot, so a zone naturally yields
// "multiple per area" with no extra bookkeeping. Uncapped by design.
export const LEGENDARY_CHANCE = 0.05;
// Stat mults tuned via headless sim (tools/balance pattern). Legendary/SE are the
// SAME creature ×mult, and the creature roster spans a wide power band relative to
// its on-level farmer, so a single global mult can't be uniformly "a real fight"
// everywhere: it is tuned so the ENDGAME apex (Stormcrown's Celestial Warden) is a
// genuine but winnable fight for a geared+buffed player — Legendary ~65% win, Super
// Elite ~33% (a hard gamble) — rather than the impossible 0-3% that ×1.6/×2.4 gave
// once Spirit Cards were removed. Early/mid-zone rares are correspondingly an easier
// but still-valuable loot event (25%/50% drop), which is the right shape for an
// ARPG-style champion spawn: trivial early, threatening late.
export const LEGENDARY_STAT_MULT = 1.4;
export const LEGENDARY_DROP_CHANCE = 0.25; // author directive: 25%

// Super Elite: rolled only when the zone has NONE alive (map.js checks
// anySuperEliteAlive first), enforcing "exactly 1 per area". Rarer than Legendary
// and a harder fight (higher mult), with a better 50% drop.
export const SUPER_ELITE_SPAWN_CHANCE = 0.015;
export const SUPER_ELITE_STAT_MULT = 1.5;
export const SUPER_ELITE_DROP_CHANCE = 0.5; // author directive: 50%

export function rollLegendary(rng) {
  return rng() < LEGENDARY_CHANCE;
}

// Zone-wide predicate: is a Super-Elite already alive anywhere on the grid?
// Cheap to scan on a 10×10 grid; the SE alive-cap rides on it.
export function anySuperEliteAlive(tiles) {
  return tiles.some((t) => t.monsters.some((m) => m.isSuperElite));
}

export function maybeRollSuperElite(rng) {
  return rng() < SUPER_ELITE_SPAWN_CHANCE;
}
