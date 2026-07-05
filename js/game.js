// Game state and rules layer. Owns the player, the map, Qi, and rewards.
// Combat math itself lives in combat.js and is never duplicated here.

import { createPlayer } from './actors.js';
import { resolveCombat, MAX_TURNS } from './combat.js';
import { createMap, moveCost, maybeRespawn, removeMonster } from './map.js';
import { mulberry32, randomSeed } from './rng.js';

// --- Qi (stamina) tuning. Prototype regen is fast so playtesting isn't
// gated on a real clock; 1.0 tuning will slow this dramatically (GDD §9.3).
export const MAX_QI = 100;
export const QI_REGEN_MS = 3_000; // 1 Qi per 3s, wall-clock

// Death penalty (GDD §8.3 starting values).
const DEATH_STONE_LOSS = 0.05;
const DEATH_XP_LOSS = 0.03;

export function createGame() {
  const worldRng = mulberry32(randomSeed());
  const state = {
    player: createPlayer(),
    map: createMap(worldRng),
    pos: { x: 0, y: 0 },
    qi: MAX_QI,
    lastQiTick: Date.now(),
    worldRng,
    log: [],
  };
  return state;
}

export function currentTile(state) {
  return state.map.at(state.pos.x, state.pos.y);
}

export function addLog(state, msg) {
  state.log.unshift({ msg, at: Date.now() });
  if (state.log.length > 30) state.log.pop();
}

// Wall-clock Qi regen: accrue whole Qi for elapsed time since the last tick.
// (Stage 0 has no persistence, but the math is already elapsed-time based so
// Stage 1 only needs to persist lastQiTick to get offline regen for free.)
export function tickQi(state, now = Date.now()) {
  if (state.qi >= MAX_QI) {
    state.lastQiTick = now;
    return;
  }
  const gained = Math.floor((now - state.lastQiTick) / QI_REGEN_MS);
  if (gained > 0) {
    state.qi = Math.min(MAX_QI, state.qi + gained);
    state.lastQiTick += gained * QI_REGEN_MS;
  }
}

export function tryMove(state, x, y) {
  if (x < 0 || y < 0 || x >= 10 || y >= 10) return { ok: false, reason: 'Out of bounds' };
  const cost = moveCost(state.pos, { x, y });
  if (cost === null) return { ok: false, reason: 'Not adjacent' };
  if (state.qi < cost) return { ok: false, reason: `Need ${cost} Qi to move` };
  state.qi -= cost;
  state.pos = { x, y };
  const tile = currentTile(state);
  maybeRespawn(tile, state.worldRng);
  return { ok: true, cost };
}

// XP scaled by level gap (GDD §8.3): punching up pays more, farming far
// below your level pays almost nothing.
function scaleXp(baseXp, playerLevel, creatureLevel) {
  const mult = Math.min(2, Math.max(0.1, 1 + 0.25 * (creatureLevel - playerLevel)));
  return Math.max(1, Math.round(baseXp * mult));
}

// Attack requires the full worst-case cost up front (GDD §8.1) so a fight
// never cuts off mid-combat; actual spend is 1 per resolved turn.
export function canAttack(state) {
  return state.qi >= MAX_TURNS;
}

export function attack(state, monsterId) {
  const tile = currentTile(state);
  const monster = tile.monsters.find((m) => m.id === monsterId);
  if (!monster) return null;
  if (!canAttack(state)) return null;

  const result = resolveCombat(state.player, monster, randomSeed());
  state.qi -= result.staminaSpent;

  const p = state.player;
  if (result.outcome === 'win') {
    const xp = scaleXp(monster.xpReward, p.level, monster.level);
    const stones = monster.stoneReward;
    p.xp += xp;
    p.spiritStones += stones;
    removeMonster(tile, monster.id);
    result.rewards = { xp, stones, itemDrop: null }; // item drops arrive in Stage 1
    addLog(state, `Slew ${monster.name} (Lv ${monster.level}): +${xp} XP, +${stones} stones.`);
  } else if (result.outcome === 'loss') {
    const stonesLost = Math.floor(p.spiritStones * DEATH_STONE_LOSS);
    const xpLost = Math.floor(p.xp * DEATH_XP_LOSS);
    p.spiritStones -= stonesLost;
    p.xp -= xpLost;
    result.penalty = { stonesLost, xpLost };
    addLog(state, `Defeated by ${monster.name}: -${stonesLost} stones, -${xpLost} XP.`);
  } else {
    addLog(state, `Combat with ${monster.name} unresolved after ${MAX_TURNS} turns.`);
  }

  // Stage 0 rule (open question in GDD): the player recovers fully after every
  // fight — win, lose, or draw. Death costs stones/XP, not downtime.
  p.hp = p.maxHp;

  result.monster = monster;
  return result;
}
