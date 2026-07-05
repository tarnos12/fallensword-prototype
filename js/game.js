// Game state and rules layer. Owns the player, the map, Qi, rewards, quests,
// and persistence. Combat math itself lives in combat.js and is never
// duplicated here.

import { createPlayer } from './actors.js';
import { resolveCombat, MAX_TURNS } from './combat.js';
import {
  ZONES,
  createZone,
  moveCost,
  maybeRespawn,
  removeMonster,
  portalAt,
} from './map.js';
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
import * as Techniques from './techniques.js';
import { rollCardDrop, acquireCard, cardBonuses, CARDS } from './cards.js';
import { saveGame, loadGame, clearSave } from './save.js';

// --- Qi (stamina) tuning. Prototype regen is fast so playtesting isn't
// gated on a real clock; 1.0 tuning will slow this dramatically (GDD §9.3).
export const MAX_QI = 500; // testing cap; 1.0 tuning will lower this
export const QI_REGEN_MS = 3_000; // 1 Qi per 3s, wall-clock
const STONE_ACCRUAL_MS = 3_600_000; // spirit-stones/hour cards accrue per real hour

// Effective Qi cap: base cap + any Qi-cap Spirit Card bonus (GDD §7.2). Always
// derived so the cap tracks the card collection with no stored duplicate.
export function maxQi(player) {
  return MAX_QI + cardBonuses(player).meta.qiCap;
}

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
        zones: {},
        zoneId: 'azuremist',
        pos: { ...ZONES.azuremist.start },
        qi: MAX_QI,
        lastQiTick: Date.now(),
        lastStoneTick: Date.now(),
        quests: Quests.createQuestState(),
        log: [],
        worldRng,
        offlineQi: 0,
        offlineStones: 0,
      };

  // Ensure every defined zone exists (fills gaps for new games, migrated v1
  // saves, and zones added after a save was written).
  if (!state.zones) state.zones = {};
  for (const id of Object.keys(ZONES)) {
    if (!state.zones[id]) state.zones[id] = createZone(id, worldRng);
  }
  if (!ZONES[state.zoneId]) state.zoneId = 'azuremist';
  state.map = state.zones[state.zoneId];

  // Fields added after a save was first written default to empty.
  if (!state.player.learnedTechniques) state.player.learnedTechniques = [];
  if (!state.player.activeBuffs) state.player.activeBuffs = [];
  if (!state.player.cards) state.player.cards = {};
  if (state.lastStoneTick == null) state.lastStoneTick = Date.now();
  state.offlineStones = 0;

  state.loadedFromSave = !!loaded;
  if (loaded) {
    const before = state.qi;
    tickQi(state); // apply offline wall-clock regen accrued while away
    state.offlineQi = state.qi - before;
    state.offlineStones = tickStones(state); // passive spirit-stone income (cards)
  } else {
    addLog(state, 'You step out from the sect gate. The wilds await.');
  }
  grantTestingKit(state);
  return state;
}

// TESTING ONLY (remove before demo): a randomized drop of every rarity tier
// plus enough points/Qi to exercise every system. The item kit is one-time;
// the points top-up re-runs when TEST_KIT_VERSION bumps so existing saves get
// newly-added testing conveniences.
const TEST_KIT_VERSION = 2;
function grantTestingKit(state) {
  const p = state.player;
  if (!p.testingKit) {
    p.testingKit = true;
    for (const rarity of Object.keys(RARITIES)) {
      const slot = state.worldRng() < 0.5 ? 'weapon' : 'robe';
      const level = 1 + Math.floor(state.worldRng() * 6);
      p.inventory.push(generateItem(slot, level, rarity, state.worldRng));
    }
    addLog(state, 'The sect quartermaster issues a testing kit: one artifact of every rarity.');
  }
  if ((p.testingKitVersion ?? 0) < TEST_KIT_VERSION) {
    p.testingKitVersion = TEST_KIT_VERSION;
    p.skillPoints += 8;
    p.statPoints += 6;
    state.qi = maxQi(p);
    addLog(state, 'Sect insight granted (testing): +8 technique points, +6 stat points.');
  }
  saveGame(state);
}

export function resetGame() {
  clearSave();
}

export function currentTile(state) {
  return state.map.at(state.pos.x, state.pos.y);
}

export function currentZone(state) {
  return ZONES[state.zoneId];
}

// A haven (each zone's start tile) is spawn-free and offers sect services
// (repair, sell). Kept as one predicate so services follow the player to
// each zone's outpost.
export function atHaven(state) {
  return currentTile(state).isStart;
}

// The portal on the current tile, if any (for the travel action).
export function currentPortal(state) {
  return portalAt(state.zoneId, state.pos.x, state.pos.y);
}

export function travel(state, portal) {
  const dest = portal ?? currentPortal(state);
  if (!dest) return { ok: false, reason: 'No portal here' };
  if (state.player.level < dest.minStage) {
    return { ok: false, reason: `Requires ${stageName(dest.minStage)}` };
  }
  state.zoneId = dest.to;
  state.map = state.zones[dest.to];
  state.pos = { x: dest.entryX, y: dest.entryY };
  maybeRespawn(state.map, currentTile(state), state.worldRng);
  Quests.onMove(state.quests, state.zoneId, state.pos.x, state.pos.y);
  addLog(state, `You travel to ${ZONES[dest.to].name}.`);
  saveGame(state);
  return { ok: true };
}

export function addLog(state, msg) {
  state.log.unshift({ msg, at: Date.now() });
  if (state.log.length > 30) state.log.pop();
}

// Wall-clock Qi regen: accrue whole Qi for elapsed time since the last tick.
export function tickQi(state, now = Date.now()) {
  const cap = maxQi(state.player);
  if (state.qi >= cap) {
    state.lastQiTick = now;
    return;
  }
  const gained = Math.floor((now - state.lastQiTick) / QI_REGEN_MS);
  if (gained > 0) {
    state.qi = Math.min(cap, state.qi + gained);
    state.lastQiTick += gained * QI_REGEN_MS;
  }
}

// Wall-clock passive income from spirit-stones/hour Spirit Cards (GDD §7.4:
// the same last-seen-timestamp machinery as Qi regen). Accrues whole stones and
// advances the timestamp only by the consumed portion, so fractions aren't lost.
// Returns the number of stones granted this tick.
export function tickStones(state, now = Date.now()) {
  const perHour = cardBonuses(state.player).meta.stones;
  if (perHour <= 0) {
    state.lastStoneTick = now;
    return 0;
  }
  const gained = Math.floor(((now - state.lastStoneTick) / STONE_ACCRUAL_MS) * perHour);
  if (gained > 0) {
    state.player.spiritStones += gained;
    state.lastStoneTick += Math.floor((gained / perHour) * STONE_ACCRUAL_MS);
  }
  return gained;
}

export function tryMove(state, x, y) {
  const size = state.map.size;
  if (x < 0 || y < 0 || x >= size || y >= size) return { ok: false, reason: 'Out of bounds' };
  const cost = moveCost(state.pos, { x, y });
  if (cost === null) return { ok: false, reason: 'Not adjacent' };
  if (state.qi < cost) return { ok: false, reason: `Need ${cost} Qi to move` };
  state.qi -= cost;
  state.pos = { x, y };
  const tile = currentTile(state);
  maybeRespawn(state.map, tile, state.worldRng);
  Quests.onMove(state.quests, state.zoneId, x, y);
  saveGame(state);
  return { ok: true, cost };
}

// XP scaled by level gap (GDD §8.3): punching up pays more, farming far
// below your level pays almost nothing.
function scaleXp(baseXp, playerLevel, creatureLevel) {
  const mult = Math.min(2, Math.max(0.1, 1 + 0.25 * (creatureLevel - playerLevel)));
  return Math.max(1, Math.round(baseXp * mult));
}

function ensureSeen(state, typeId) {
  const b = state.player.bestiary;
  if (!b[typeId]) b[typeId] = { kills: 0, firstSeenAt: Date.now() };
  return b[typeId];
}

// A Beast Codex entry is created on first encounter — inspecting OR fighting
// (GDD §7.1). Returns true if this was a new entry (for a save + re-render).
export function markSeen(state, typeId) {
  const b = state.player.bestiary;
  if (b[typeId]) return false;
  b[typeId] = { kills: 0, firstSeenAt: Date.now() };
  saveGame(state);
  return true;
}

function trackKill(state, monster) {
  ensureSeen(state, monster.typeId).kills += 1;
}

// Award a dropped Spirit Card: new card, duplicate upgrade, or (beyond max) a
// spirit-stone payout (GDD §7.2). Returns the acquire result for the banner.
function grantCard(state, cardId) {
  const res = acquireCard(state.player, cardId);
  const c = CARDS[cardId];
  if (res.kind === 'new') {
    addLog(state, `Spirit Card obtained: ${c.creatureName} (Lv 1)!`);
  } else if (res.kind === 'upgrade') {
    addLog(state, `Spirit Card refined: ${c.creatureName} → Lv ${res.level}.`);
  } else if (res.kind === 'duplicate') {
    state.player.spiritStones += res.stones;
    addLog(state, `Duplicate ${c.creatureName} card dissolves into ${res.stones} spirit stones.`);
  }
  return res;
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
  ensureSeen(state, monster.typeId); // facing a beast enters it in the codex
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
    // Spirit Card roll is independent of the loot roll (GDD §7.2) — a card
    // never replaces an item drop.
    const cardId = rollCardDrop(monster.typeId, state.worldRng);
    if (cardId) result.cardDrop = grantCard(state, cardId);

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

// --- Techniques (learn with banked points; cast for a timed Qi-cost buff) ---

export function learnTechnique(state, id) {
  const res = Techniques.learn(state.player, id);
  if (res.ok) {
    addLog(state, `You comprehend the ${Techniques.get(id).name}.`);
    saveGame(state);
  } else if (res.reason) {
    addLog(state, res.reason);
  }
  return res;
}

export function castTechnique(state, id) {
  const res = Techniques.cast(state.player, state.qi, id);
  if (res.ok) {
    state.qi -= res.cost;
    addLog(state, `You channel ${Techniques.get(id).name} (${Math.round(res.duration / 1000)}s).`);
    saveGame(state);
  } else if (res.reason) {
    addLog(state, res.reason);
  }
  return res;
}

// Drop expired buffs; returns true if anything changed (for re-render).
export function tickBuffs(state, now = Date.now()) {
  const expired = Techniques.cleanExpired(state.player, now);
  for (const b of expired) addLog(state, `${Techniques.get(b.techniqueId).name} fades.`);
  if (expired.length) saveGame(state);
  return expired.length > 0;
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
  if (!atHaven(state)) return false;
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
  if (!atHaven(state)) return false;
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
