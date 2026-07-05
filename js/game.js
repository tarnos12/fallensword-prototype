// Game state and rules layer. Owns the player, the map, Qi, rewards, quests,
// and persistence. Combat math itself lives in combat.js and is never
// duplicated here.

import { createPlayer } from './actors.js';
import { resolveCombat, MAX_TURNS } from './combat.js';
import { createMap, moveCost, maybeRespawn, removeMonster } from './map.js';
import { mulberry32, randomSeed } from './rng.js';
import {
  playerCombatActor,
  effectiveStats,
  applyBreakthroughs,
  allocateStat as allocPoint,
  stageName,
} from './progression.js';
import {
  rollDrop,
  generateItem,
  RARITIES,
  degradeEquipment,
  equipItem as equip,
  unequipItem as unequip,
  repairCost,
  sellValue,
  INVENTORY_SIZE,
} from './items.js';
import * as Quests from './quests.js';
import { saveGame, loadGame, clearSave } from './save.js';

// --- Qi (stamina) tuning. Prototype regen is fast so playtesting isn't
// gated on a real clock; 1.0 tuning will slow this dramatically (GDD §9.3).
export const MAX_QI = 500; // testing cap; 1.0 tuning will lower this
export const QI_REGEN_MS = 3_000; // 1 Qi per 3s, wall-clock

// Death penalty (GDD §8.3 starting values). XP loss is progress toward the
// next stage only — a death can never undo a breakthrough.
const DEATH_STONE_LOSS = 0.05;
const DEATH_XP_LOSS = 0.03;

export function createGame() {
  const worldRng = mulberry32(randomSeed());
  const loaded = loadGame();
  const state = loaded
    ? { ...loaded, worldRng, offlineQi: 0 }
    : {
        player: createPlayer(),
        map: createMap(worldRng),
        pos: { x: 0, y: 0 },
        qi: MAX_QI,
        lastQiTick: Date.now(),
        quests: Quests.createQuestState(),
        log: [],
        worldRng,
        offlineQi: 0,
      };
  state.loadedFromSave = !!loaded;
  if (loaded) {
    const before = state.qi;
    tickQi(state); // apply offline wall-clock regen accrued while away
    state.offlineQi = state.qi - before;
  } else {
    addLog(state, 'You step out from the sect gate. The wilds await.');
  }
  grantTestingKit(state);
  return state;
}

// TESTING ONLY (remove before demo): one randomized drop of every rarity
// tier, rolled exactly like an enemy drop, plus a full Qi top-up. Granted
// once per save via the testingKit flag.
function grantTestingKit(state) {
  if (state.player.testingKit) return;
  state.player.testingKit = true;
  for (const rarity of Object.keys(RARITIES)) {
    const slot = state.worldRng() < 0.5 ? 'weapon' : 'robe';
    const level = 1 + Math.floor(state.worldRng() * 6);
    state.player.inventory.push(generateItem(slot, level, rarity, state.worldRng));
  }
  state.qi = MAX_QI;
  addLog(state, 'The sect quartermaster issues a testing kit: one artifact of every rarity.');
  saveGame(state);
}

export function resetGame() {
  clearSave();
}

export function currentTile(state) {
  return state.map.at(state.pos.x, state.pos.y);
}

export function atSectGate(state) {
  return currentTile(state).isStart;
}

export function addLog(state, msg) {
  state.log.unshift({ msg, at: Date.now() });
  if (state.log.length > 30) state.log.pop();
}

// Wall-clock Qi regen: accrue whole Qi for elapsed time since the last tick.
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
  Quests.onMove(state.quests, x, y);
  saveGame(state);
  return { ok: true, cost };
}

// XP scaled by level gap (GDD §8.3): punching up pays more, farming far
// below your level pays almost nothing.
function scaleXp(baseXp, playerLevel, creatureLevel) {
  const mult = Math.min(2, Math.max(0.1, 1 + 0.25 * (creatureLevel - playerLevel)));
  return Math.max(1, Math.round(baseXp * mult));
}

function trackKill(state, monster) {
  const b = state.player.bestiary;
  if (!b[monster.typeId]) b[monster.typeId] = { kills: 0, firstSeenAt: Date.now() };
  b[monster.typeId].kills += 1;
}

function grantXp(state, xp) {
  const p = state.player;
  p.xp += xp;
  const stages = applyBreakthroughs(p);
  if (stages > 0) {
    addLog(state, `Breakthrough! You reach ${stageName(p.level)} (+${3 * stages} stat points).`);
    Quests.onStage(state.quests, p.level);
  }
  return stages;
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

  const result = resolveCombat(playerCombatActor(state.player), monster, randomSeed());
  state.qi -= result.staminaSpent;

  const p = state.player;
  degradeEquipment(p); // gear wears with use, win or lose
  Quests.onFace(state.quests, monster.typeId);

  if (result.outcome === 'win') {
    const xp = scaleXp(monster.xpReward, p.level, monster.level);
    const stones = monster.stoneReward;
    p.spiritStones += stones;
    trackKill(state, monster);
    Quests.onKill(state.quests, monster.typeId);
    removeMonster(tile, monster.id);

    const drop = rollDrop(monster.level, state.worldRng);
    if (drop) {
      if (p.inventory.length < INVENTORY_SIZE) {
        p.inventory.push(drop);
        addLog(state, `Loot: ${drop.name} (Lv ${drop.level}).`);
      } else {
        addLog(state, `A ${drop.name} dropped, but your pack is full — it is lost.`);
      }
    }
    result.rewards = { xp, stones, itemDrop: drop };
    addLog(state, `Slew ${monster.name} (Lv ${monster.level}): +${xp} XP, +${stones} stones.`);
    grantXp(state, xp);
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

  result.monster = monster;
  saveGame(state);
  return result;
}

// --- Character / gear / quest actions (each saves on success) ---

export function allocateStat(state, stat) {
  const ok = allocPoint(state.player, stat);
  if (ok) saveGame(state);
  return ok;
}

export function equipItem(state, itemId) {
  const ok = equip(state.player, itemId);
  if (ok) saveGame(state);
  return ok;
}

export function unequipItem(state, slot) {
  const ok = unequip(state.player, slot);
  if (!ok && state.player.equipment[slot]) addLog(state, 'Your pack is full.');
  if (ok) saveGame(state);
  return ok;
}

export function sellItem(state, itemId) {
  if (!atSectGate(state)) return false;
  const idx = state.player.inventory.findIndex((i) => i.id === itemId);
  if (idx === -1) return false;
  const item = state.player.inventory[idx];
  state.player.inventory.splice(idx, 1);
  state.player.spiritStones += sellValue(item);
  addLog(state, `Sold ${item.name} for ${sellValue(item)} stones.`);
  saveGame(state);
  return true;
}

export function destroyItem(state, itemId) {
  const idx = state.player.inventory.findIndex((i) => i.id === itemId);
  if (idx === -1) return false;
  addLog(state, `Destroyed ${state.player.inventory[idx].name}.`);
  state.player.inventory.splice(idx, 1);
  saveGame(state);
  return true;
}

export function totalRepairCost(state) {
  return Object.values(state.player.equipment)
    .filter(Boolean)
    .reduce((sum, item) => sum + repairCost(item), 0);
}

export function repairAll(state) {
  if (!atSectGate(state)) return false;
  const cost = totalRepairCost(state);
  if (cost === 0 || state.player.spiritStones < cost) return false;
  state.player.spiritStones -= cost;
  for (const item of Object.values(state.player.equipment)) {
    if (item) item.durability = item.maxDurability;
  }
  addLog(state, `Repaired your artifacts for ${cost} stones.`);
  saveGame(state);
  return true;
}

export function claimQuest(state) {
  const qs = state.quests;
  const q = Quests.currentQuest(qs);
  if (!q || !qs.claimable) return false;
  const p = state.player;
  const r = q.reward;
  if (r.item && p.inventory.length >= INVENTORY_SIZE) {
    addLog(state, 'Your pack is full — make room to claim the quest reward.');
    return false;
  }
  if (r.stones) p.spiritStones += r.stones;
  if (r.item) {
    const item = generateItem(r.item.slot, r.item.level, r.item.rarity, state.worldRng);
    p.inventory.push(item);
    addLog(state, `Quest reward: ${item.name}.`);
  }
  addLog(state, `Quest complete: ${q.title}.`);
  if (r.xp) grantXp(state, r.xp);
  Quests.advance(qs, p.level);
  saveGame(state);
  return true;
}

export { effectiveStats, stageName };
