// Game state and rules layer. Owns the player, the map, Qi, rewards, quests,
// and persistence. Combat math itself lives in combat.js and is never
// duplicated here.

import { createPlayer, spawnCreature, CREATURE_TYPES } from './actors.js';
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
  xpForBreakthrough,
} from './progression.js';
import {
  rollDrop,
  generateItem,
  mintNamedItem,
  RARITIES,
  degradeEquipment,
  equipItem as equip,
  unequipItem as unequip,
  repairCost,
  sellValue,
  INVENTORY_SIZE,
  reforgeItem,
  upgradeItem,
  canUpgradeItem,
  reforgeCost,
  upgradeCost,
} from './items.js';
import * as Quests from './quests.js';
import * as Techniques from './techniques.js';
import { rollCardDrop, acquireCard, cardBonuses, CARDS } from './cards.js';
import { createMarketProvider, emptyMarket } from './market.js';
import { createGuildProvider, guildBuffs } from './guild.js';
import { createBountyProvider } from './bounties.js';
import { saveLoadout, applyLoadout, deleteLoadout } from './loadouts.js';
import { normalizeBossState, maybeManifestBoss, onBossDefeated, bossHints } from './boss.js';
import { recordAchievements } from './achievements.js';
import * as Trials from './trials.js';
import { eventReward } from './events.js';
import { saveGame, loadGame, clearSave } from './save.js';

// --- Qi (stamina) tuning. Prototype regen is fast so playtesting isn't
// gated on a real clock; 1.0 tuning will slow this dramatically (GDD §9.3).
export const MAX_QI = 500; // testing cap; 1.0 tuning will lower this
export const QI_REGEN_MS = 3_000; // 1 Qi per 3s, wall-clock
const STONE_ACCRUAL_MS = 3_600_000; // spirit-stones/hour cards accrue per real hour

// Effective Qi cap: base cap + Qi-cap bonuses from Spirit Cards (GDD §7.2) and
// sect disciples (GDD §4.3). Always derived so the cap tracks owned sources.
export function maxQi(player) {
  return MAX_QI + cardBonuses(player).meta.qiCap + guildBuffs(player).qiCap;
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
        market: emptyMarket(),
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
  if (!state.player.guild) state.player.guild = { members: [] };
  if (!state.player.loadouts) state.player.loadouts = [];
  normalizeBossState(state.player); // create {} for new saves; migrate old single-boss shape
  if (!state.player.achievements) state.player.achievements = [];
  if (!state.player.trials) state.player.trials = { lastDay: -1, plays: 0, wins: 0 };
  if (!state.player.stats) state.player.stats = {}; // lifetime counters (task S3); keys default lazily
  if (state.lastStoneTick == null) state.lastStoneTick = Date.now();
  if (!state.market) state.market = emptyMarket();
  state.offlineStones = 0;

  // The Treasure Pavilion provider (GDD §6.7) is created fresh each load over
  // the persisted market state; normalize() inside back-fills legacy blobs.
  state.marketProvider = createMarketProvider(state);
  // The Sect / Warband provider (GDD §4.3) — hired disciples live on the player,
  // so it just wraps that persisted membership list.
  state.guildProvider = createGuildProvider(state);
  // The Hunt-bounty provider — offered board is deterministic from the clock;
  // accepted bounties live on the player, so it just wraps that.
  state.bountyProvider = createBountyProvider(state);

  state.loadedFromSave = !!loaded;
  if (loaded) {
    const before = state.qi;
    tickQi(state); // apply offline wall-clock regen accrued while away
    state.offlineQi = state.qi - before;
    state.offlineStones = tickStones(state); // passive spirit-stone income (cards)
  } else {
    addLog(state, 'You step out from the sect gate. The wilds await.');
  }
  // Rotate listings and resolve any player sales that completed while away.
  state.offlineMarket = state.marketProvider.tick();
  // Re-manifest the Ancient Terror if the player reloaded standing on its lair.
  maybeBossHint(state);
  manifestBoss(state);
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

// Achievements (GDD §6.5): a light idempotent "check & record" hook. Milestones
// are derived read-only from player state, so calling this after any state
// change is safe and cheap; it only persists when something new is unlocked.
// Returns the newly-unlocked achievements so the caller can toast them.
export function checkAchievements(state) {
  const fresh = recordAchievements(state);
  if (fresh.length) {
    for (const a of fresh) addLog(state, `Achievement unlocked: ${a.name}.`);
    saveGame(state);
  }
  return fresh;
}

// Lifetime playtime accrual (task S3). Called on the world tick; accumulates only
// *active* time by ignoring long gaps (tab backgrounded/asleep), so it measures
// time actually spent playing rather than wall-clock since first launch. Doesn't
// save itself — the value persists on the next natural saveGame (cheap vanity
// stat, so an approximate last-few-minutes loss on a hard close is fine).
export function tickPlaytime(state, now = Date.now()) {
  const st = state.player.stats || (state.player.stats = {});
  if (state._lastPlayTick == null) {
    state._lastPlayTick = now;
    return;
  }
  const delta = now - state._lastPlayTick;
  state._lastPlayTick = now;
  if (delta > 0 && delta < 5000) st.msPlayed = (st.msPlayed || 0) + delta;
}

// Daily Trial (GDD §5): resolve today's one-attempt challenge. The foe is
// authored in trials.js (deterministic per UTC day + level); the fight goes
// through the shared pure resolveCombat, so it's the same math as any bout —
// only the reward path differs. A win pays bonus stones/XP (+ a chance at gear);
// a loss/draw costs nothing. Costs no Qi — it's a daily ritual, not a wilds fight.
export function attemptDailyTrial(state) {
  const p = state.player;
  if (!p.trials) p.trials = { lastDay: -1, plays: 0, wins: 0 };
  if (Trials.attemptedToday(p)) return { ok: false, reason: "You have already faced today's trial." };

  const { foe, reward } = Trials.todaysTrial(p);
  const me = playerCombatActor(p);
  const result = resolveCombat(me, foe, randomSeed());

  p.trials.lastDay = Trials.dayNumber();
  p.trials.plays += 1;

  const out = { ok: true, outcome: result.outcome, foe, result, reward: null };
  if (result.outcome === 'win') {
    p.trials.wins += 1;
    p.spiritStones += reward.stones;
    grantXp(state, reward.xp);
    const granted = { stones: reward.stones, xp: reward.xp, item: null };
    // Gear reward: rolled at claim, capped like any drop; skipped if the pack is full.
    if (reward.itemChance && state.worldRng() < reward.itemChance) {
      const slot = state.worldRng() < 0.5 ? 'weapon' : 'robe';
      const item = generateItem(slot, p.level, null, state.worldRng);
      if (p.inventory.length < INVENTORY_SIZE) {
        p.inventory.push(item);
        granted.item = item;
      }
    }
    out.reward = granted;
    addLog(
      state,
      `Daily Trial won against ${foe.name}: +${reward.stones} stones, +${reward.xp} XP${granted.item ? `, looted ${granted.item.name}` : ''}.`
    );
  } else if (result.outcome === 'loss') {
    addLog(state, `Daily Trial: ${foe.name} bested you. No penalty — return tomorrow.`);
  } else {
    addLog(state, `Daily Trial against ${foe.name} ended in a draw. Return tomorrow.`);
  }
  saveGame(state);
  return out;
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
  maybeBossHint(state);
  manifestBoss(state);
  saveGame(state);
  return { ok: true };
}

export function addLog(state, msg) {
  state.log.unshift({ msg, at: Date.now() });
  if (state.log.length > 30) state.log.pop();
}

// Manifest whichever calamity's lair the player has just arrived at (or loaded
// onto) when it's ready (stage-gated + off cooldown). Announces it once. Called
// from move/travel/load.
export function manifestBoss(state, now = Date.now()) {
  const boss = maybeManifestBoss(state, now);
  if (boss) {
    addLog(state, `The air curdles cold. ${boss.name} uncoils from its lair — a calamity has manifested.`);
    return true;
  }
  return false;
}

// One-time breadcrumbs pointing an eligible cultivator toward each lair in the
// current zone, so the endgame encounters are discoverable without a quest.
function maybeBossHint(state) {
  for (const msg of bossHints(state)) addLog(state, msg);
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
  const perHour = cardBonuses(state.player).meta.stones + guildBuffs(state.player).stonesPerHour;
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
  maybeBossHint(state);
  manifestBoss(state);
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

  const actor = playerCombatActor(state.player);
  applyGodStats(actor); // TESTING ONLY: no-op unless debug god mode is on
  const result = resolveCombat(actor, monster, randomSeed());
  state.qi -= result.staminaSpent;

  const p = state.player;
  degradeEquipment(p); // gear wears with use, win or lose
  ensureSeen(state, monster.typeId); // facing a beast enters it in the codex
  Quests.onFace(state.quests, monster.typeId);

  if (result.outcome === 'win') {
    // Sect disciples buff battle rewards (GDD §4.3): XP and spirit-stone gain.
    const gb = guildBuffs(p);
    let xp, stones, drop, cardId;
    if (monster.isBoss) {
      // The Ancient Terror (GDD §9.1): hand-authored calamity rewards plus the
      // game's first Epic/Legendary drop and the boss Spirit Card, all resolved
      // (and the wall-clock cooldown armed) in boss.js.
      const br = onBossDefeated(state, monster, state.worldRng);
      xp = Math.round(br.xp * (1 + gb.xpPct));
      stones = Math.round(br.stones * (1 + gb.stonePct));
      drop = br.drop;
      cardId = br.cardId;
    } else {
      xp = Math.round(scaleXp(monster.xpReward, p.level, monster.level) * (1 + gb.xpPct));
      stones = Math.round(monster.stoneReward * (1 + gb.stonePct));
      drop = rollDrop(monster.level, state.worldRng);
      // Spirit Card roll is independent of the loot roll (GDD §7.2) — a card
      // never replaces an item drop.
      cardId = rollCardDrop(monster.typeId, state.worldRng);
    }
    // World event (task R): the active calendar event's global reward multipliers.
    const ev = eventReward();
    xp = Math.round(xp * ev.xpMult);
    stones = Math.round(stones * ev.stoneMult);
    p.spiritStones += stones;
    trackKill(state, monster);
    Quests.onKill(state.quests, monster.typeId);
    removeMonster(tile, monster.id);
    // Lifetime stats (task S3): counters that can't be derived from save state.
    const st = p.stats || (p.stats = {});
    st.fightsWon = (st.fightsWon || 0) + 1;
    st.stonesWon = (st.stonesWon || 0) + stones;

    if (drop) {
      if (p.inventory.length < INVENTORY_SIZE) {
        p.inventory.push(drop);
        st.itemsLooted = (st.itemsLooted || 0) + 1;
        addLog(state, `Loot: ${drop.name} (Lv ${drop.level}).`);
      } else {
        addLog(state, `A ${drop.name} dropped, but your pack is full — it is lost.`);
      }
    }
    if (cardId) result.cardDrop = grantCard(state, cardId);

    result.rewards = { xp, stones, itemDrop: drop };
    result.bossKill = monster.isBoss || undefined;
    addLog(
      state,
      monster.isBoss
        ? `${monster.name} is vanquished! +${xp} XP, +${stones} spirit stones. The calamity recedes into the deep.`
        : `Slew ${monster.name} (Lv ${monster.level}): +${xp} XP, +${stones} stones.`
    );
    grantXp(state, xp);
  } else if (result.outcome === 'loss') {
    const stonesLost = Math.floor(p.spiritStones * DEATH_STONE_LOSS);
    const xpLost = Math.floor(p.xp * DEATH_XP_LOSS);
    p.spiritStones -= stonesLost;
    p.xp -= xpLost;
    result.penalty = { stonesLost, xpLost };
    const st = p.stats || (p.stats = {});
    st.fightsLost = (st.fightsLost || 0) + 1;
    addLog(state, `Defeated by ${monster.name}: -${stonesLost} stones, -${xpLost} XP.`);
  } else {
    const st = p.stats || (p.stats = {});
    st.fightsDrawn = (st.fightsDrawn || 0) + 1;
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

// --- Crafting & Forge (GDD §5). Thin wrappers over the items.js forge helpers:
// spend spirit stones to reroll ("reforge"), level up ("temper/upgrade"), or
// repair one artifact — from anywhere, not just a haven. Each persists on
// success. The Forge modal (js/crafting.js) reads the same cost fns for display.

// Resolve an item id to the live object whether it's worn or in the pack.
function ownedItem(player, itemId) {
  for (const it of Object.values(player.equipment)) if (it && it.id === itemId) return it;
  return player.inventory.find((i) => i.id === itemId) ?? null;
}

export function forgeReforge(state, itemId) {
  const item = ownedItem(state.player, itemId);
  if (!item) return { ok: false };
  const cost = reforgeCost(item);
  if (state.player.spiritStones < cost) {
    addLog(state, `Reforging ${item.name} needs ${cost} spirit stones.`);
    return { ok: false, reason: 'stones' };
  }
  state.player.spiritStones -= cost;
  reforgeItem(item, state.worldRng);
  addLog(state, `Reforged ${item.name} — its spirit-forces realign anew (−${cost} ◆).`);
  saveGame(state);
  return { ok: true, item };
}

export function forgeUpgrade(state, itemId) {
  const item = ownedItem(state.player, itemId);
  if (!item) return { ok: false };
  if (!canUpgradeItem(item)) {
    addLog(state, `${item.name} is already at peak refinement.`);
    return { ok: false, reason: 'max' };
  }
  const cost = upgradeCost(item);
  if (state.player.spiritStones < cost) {
    addLog(state, `Tempering ${item.name} needs ${cost} spirit stones.`);
    return { ok: false, reason: 'stones' };
  }
  state.player.spiritStones -= cost;
  upgradeItem(item);
  addLog(state, `Tempered ${item.name} to Lv ${item.level} (−${cost} ◆).`);
  saveGame(state);
  return { ok: true, item };
}

export function forgeRepair(state, itemId) {
  const item = ownedItem(state.player, itemId);
  if (!item) return { ok: false };
  const cost = repairCost(item);
  if (cost === 0) return { ok: false, reason: 'full' };
  if (state.player.spiritStones < cost) {
    addLog(state, `Repairing ${item.name} needs ${cost} spirit stones.`);
    return { ok: false, reason: 'stones' };
  }
  state.player.spiritStones -= cost;
  item.durability = item.maxDurability;
  addLog(state, `Repaired ${item.name} at the forge (−${cost} ◆).`);
  saveGame(state);
  return { ok: true, item };
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
    // A reward may name a specific hand-authored artifact (epic quest chain,
    // GDD §5) or specify slot/level/rarity for a rolled one.
    const item = r.item.named
      ? mintNamedItem(r.item.named)
      : generateItem(r.item.slot, r.item.level, r.item.rarity, state.worldRng);
    p.inventory.push(item);
    addLog(state, `Quest reward: ${item.name}.`);
  }
  addLog(state, `Quest complete: ${q.title}.`);
  if (r.xp) grantXp(state, r.xp);
  Quests.advance(qs, p.level);
  saveGame(state);
  return true;
}

// --- Treasure Pavilion (fake-multiplayer market, GDD §6.7). Thin wrappers over
// the MarketProvider that log outcomes and persist on any change. ---

// Rotate NPC listings + resolve completed player sales. Called on the world
// tick; saves only when something actually changed (like tickQi's pattern).
export function tickMarket(state, now = Date.now()) {
  const res = state.marketProvider.tick(now);
  for (const pl of res.sales) addLog(state, `The Pavilion sold your ${pl.item.name} — proceeds await in your mailbox.`);
  for (const pl of res.returns) addLog(state, `Your ${pl.item.name} went unsold and was returned to your mailbox.`);
  if (res.changed) saveGame(state);
  return res;
}

export function marketListings(state, filters) {
  return state.marketProvider.getListings(filters);
}

export function marketPlayerListings(state) {
  return state.marketProvider.getPlayerListings();
}

export function marketMailbox(state) {
  return state.marketProvider.getMailbox();
}

export function marketBuy(state, listingId) {
  const res = state.marketProvider.buyNow(listingId);
  if (res.ok) {
    addLog(
      state,
      res.toMailbox
        ? `Bought ${res.item.name} for ${res.price} stones — pack full, delivered to your mailbox.`
        : `Bought ${res.item.name} for ${res.price} stones.`
    );
    saveGame(state);
  } else if (res.reason) {
    addLog(state, res.reason);
  }
  return res;
}

export function marketList(state, itemId, price) {
  const res = state.marketProvider.listItem(itemId, price);
  if (res.ok) {
    addLog(state, `Listed ${res.listing.item.name} in the Treasure Pavilion for ${res.listing.price} stones.`);
    saveGame(state);
  } else if (res.reason) {
    addLog(state, res.reason);
  }
  return res;
}

export function marketCancel(state, listingId) {
  const res = state.marketProvider.cancelListing(listingId);
  if (res.ok) {
    addLog(state, `Reclaimed ${res.item.name} from the Pavilion.`);
    saveGame(state);
  } else if (res.reason) {
    addLog(state, res.reason);
  }
  return res;
}

export function marketCollect(state) {
  const res = state.marketProvider.collectMailbox();
  const bits = [];
  if (res.stones) bits.push(`${res.stones} spirit stones`);
  if (res.items.length) bits.push(`${res.items.length} item(s)`);
  if (bits.length) addLog(state, `Collected ${bits.join(' and ')} from your mailbox.`);
  if (res.blocked) addLog(state, `${res.blocked} item(s) remain — clear pack space to collect them.`);
  if (res.stones || res.items.length) saveGame(state);
  return res;
}

// --- Sect / Warband (guild stub, GDD §4.3). Thin wrappers over the
// GuildProvider that log outcomes and persist on success. ---

export function guildRecruits(state) {
  return state.guildProvider.getRecruits();
}

export function guildMembers(state) {
  return state.guildProvider.getMembers();
}

export function guildBuffSummary(state) {
  return state.guildProvider.buffs();
}

export function hireDisciple(state, personaId) {
  const res = state.guildProvider.hire(personaId);
  if (res.ok) {
    addLog(state, `${res.persona.name} joins your sect as a ${res.specialty.name} (−${res.cost} stones).`);
    saveGame(state);
  } else if (res.reason) {
    addLog(state, res.reason);
  }
  return res;
}

export function dismissDisciple(state, personaId) {
  const res = state.guildProvider.dismiss(personaId);
  if (res.ok) {
    addLog(state, `${res.persona?.name ?? 'A disciple'} departs your sect.`);
    saveGame(state);
  } else if (res.reason) {
    addLog(state, res.reason);
  }
  return res;
}

// --- Hunt bounties. Thin wrappers over the BountyProvider that log outcomes,
// apply the claim reward through the shared XP/stone path, and persist. ---

export function acceptBounty(state, bountyId, now = Date.now()) {
  const res = state.bountyProvider.accept(bountyId, now);
  if (res.ok) {
    addLog(state, `Bounty accepted: slay ${res.bounty.target} ${res.bounty.name}.`);
    saveGame(state);
  } else if (res.reason) {
    addLog(state, res.reason);
  }
  return res;
}

export function claimBounty(state, bountyId) {
  const res = state.bountyProvider.claim(bountyId);
  if (res.ok) {
    state.player.spiritStones += res.reward.stones;
    addLog(state, `Bounty complete — ${res.target} ${res.name} slain: +${res.reward.stones} spirit stones, +${res.reward.xp} XP.`);
    grantXp(state, res.reward.xp); // applies breakthroughs + logs
    saveGame(state);
  } else if (res.reason) {
    addLog(state, res.reason);
  }
  return res;
}

// =====================================================================
// TESTING ONLY — debug tools (strip before demo). Remove this whole block,
// the `applyGodStats` call in attack(), `setDropMultiplier`/
// `setCardDropMultiplier` in items.js/cards.js, and `js/debug.js` + its
// wiring in main.js to fully strip the debug tooling.
// =====================================================================

let DEBUG_GOD = false;

export function setGodMode(on) {
  DEBUG_GOD = !!on;
}

export function isGodMode() {
  return DEBUG_GOD;
}

// Boosts a combat snapshot so the player one-shots anything and never dies.
// A no-op unless god mode is on, so it's safe to leave in the attack path.
function applyGodStats(actor) {
  if (!DEBUG_GOD) return;
  actor.stats.attack = 99999;
  actor.stats.damage = 99999;
  actor.stats.defense = 99999;
  actor.stats.armor = 99999;
  actor.hp = 99999;
  actor.maxHp = 99999;
}

export function debugSpawn(state, typeId, level) {
  const tile = currentTile(state);
  const lv = Number.isFinite(level) && level > 0 ? level : undefined;
  const mon = spawnCreature(typeId, lv, state.worldRng);
  tile.monsters.push(mon);
  if (tile.clearedAt !== null) tile.clearedAt = null;
  addLog(state, `[debug] Spawned ${mon.name} (Lv ${mon.level}) on this tile.`);
  saveGame(state);
}

export function debugClearTile(state) {
  currentTile(state).monsters = [];
  addLog(state, '[debug] Cleared this tile.');
  saveGame(state);
}

export function debugGrant(state, what) {
  const p = state.player;
  switch (what) {
    case 'stones':
      p.spiritStones += 5000;
      addLog(state, '[debug] +5000 spirit stones.');
      break;
    case 'xp':
      grantXp(state, 500);
      addLog(state, '[debug] +500 XP.');
      break;
    case 'statpts':
      p.statPoints += 5;
      addLog(state, '[debug] +5 stat points.');
      break;
    case 'techpts':
      p.skillPoints += 5;
      addLog(state, '[debug] +5 technique points.');
      break;
    case 'qi':
      state.qi = maxQi(p);
      addLog(state, '[debug] Qi refilled.');
      break;
    case 'breakthrough':
      grantXp(state, xpForBreakthrough(p.level)); // enough for one breakthrough
      break;
    default:
      return;
  }
  saveGame(state);
}

export function debugGiveItem(state, slot, rarity, level) {
  const p = state.player;
  if (p.inventory.length >= INVENTORY_SIZE) {
    addLog(state, '[debug] Pack full — cannot add item.');
    return;
  }
  const lv = Number.isFinite(level) && level > 0 ? level : 1;
  const item = generateItem(slot, lv, rarity, state.worldRng);
  p.inventory.push(item);
  addLog(state, `[debug] Added ${item.name} (Lv ${item.level}, ${rarity}).`);
  saveGame(state);
}

export function debugCards(state, mode) {
  const p = state.player;
  if (!p.cards) p.cards = {};
  if (mode === 'clear') {
    p.cards = {};
    addLog(state, '[debug] Cleared all Spirit Cards.');
  } else {
    for (const id of Object.keys(CARDS)) {
      p.cards[id] = mode === 'max' ? CARDS[id].maxLevel : Math.max(1, p.cards[id] ?? 0);
    }
    addLog(state, mode === 'max' ? '[debug] All Spirit Cards maxed.' : '[debug] Granted all Spirit Cards.');
  }
  saveGame(state);
}

export function debugRevealCodex(state) {
  const now = Date.now();
  for (const typeId of Object.keys(CREATURE_TYPES)) {
    state.player.bestiary[typeId] = { kills: 100, firstSeenAt: now };
  }
  addLog(state, '[debug] Beast Codex fully revealed (100 kills each).');
  saveGame(state);
}

export function debugMarket(state, mode) {
  const m = state.market;
  if (mode === 'refresh') {
    m.listings = [];
    m.lastRefresh = 0;
    state.marketProvider.tick();
    addLog(state, '[debug] Rotated Pavilion listings.');
  } else if (mode === 'resolve') {
    for (const pl of m.playerListings) {
      if (pl.willSell) pl.sellAt = 0; // resolve as a sale now
      else pl.expiresAt = 0; // expire (return) now
    }
    tickMarket(state);
    addLog(state, '[debug] Resolved all your listings.');
  }
  saveGame(state);
}

// --- Combat Sets / loadouts (GDD §6.2). Thin wrappers over loadouts.js that
// log outcomes and persist. ---

export function saveLoadoutAction(state, name) {
  const res = saveLoadout(state.player, name);
  if (res.ok) {
    addLog(state, res.overwrote ? `Updated combat set "${res.set.name}".` : `Saved combat set "${res.set.name}".`);
    saveGame(state);
  } else if (res.reason) {
    addLog(state, res.reason);
  }
  return res;
}

export function applyLoadoutAction(state, index) {
  const res = applyLoadout(state.player, index);
  if (res.ok) {
    const set = state.player.loadouts[index];
    addLog(state, `Equipped combat set "${set.name}".`);
    if (res.missing.length) addLog(state, `Some pieces were missing: ${res.missing.join(', ')}.`);
    saveGame(state);
  } else if (res.reason) {
    addLog(state, res.reason);
  }
  return res;
}

export function deleteLoadoutAction(state, index) {
  const res = deleteLoadout(state.player, index);
  if (res.ok) {
    addLog(state, `Deleted combat set "${res.removed.name}".`);
    saveGame(state);
  }
  return res;
}

export { effectiveStats, stageName };
