// Game state and rules layer. Owns the player, the map, Qi, rewards, quests,
// and persistence. Combat math itself lives in combat.js and is never
// duplicated here.

import { createPlayer, spawnCreature } from './actors.js';
import { resolveCombat, MAX_TURNS } from './combat.js';
import {
  ZONES,
  createZone,
  moveCost,
  maybeRespawn,
  removeMonster,
  portalAt,
} from './map.js';
// Wave 2 rare-spawn / Titan economy (doc 40 §2-§5).
import { LEGENDARY_DROP_CHANCE, SUPER_ELITE_DROP_CHANCE, LEGENDARY_STAT_MULT, SUPER_ELITE_STAT_MULT } from './rarespawns.js';
import { spawnTitanActor, placeTitanRandomly, relocateTitan } from './titans.js';
import { isForceDropsOn } from './debug.js';
// Premium currency (Merit) award hook. Build-Economy owns js/merit.js; signature
// awardMerit(player, amount) mutates player.merit. Written against that contract
// now; the file lands at integration. Amounts per doc 40 §3.3 / Economy's earn
// table: Legendary +2, Super-Elite +6, Titan +20 (boss clears live in boss.js).
import { awardMerit } from './merit.js';
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
  mintNamedItem,
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
  gearQiRegenBonus,
  effectiveInventorySize,
} from './items.js';
import { meritShopBonuses } from './meritshop.js';
import { sfx } from './audio.js'; // fire-and-forget SFX cues (Wave 3 Feel); no-op when muted/headless
import * as Quests from './quests.js';
import * as Techniques from './techniques.js';
import { createMarketProvider, emptyMarket } from './market.js';
import { createGuildProvider, guildBuffs } from './guild.js';
import { createBountyProvider } from './bounties.js';
import { createSectMissionProvider } from './sectmissions.js';
import { performAscension, canAscend } from './ascension.js';
import { saveLoadout, applyLoadout, deleteLoadout } from './loadouts.js';
import { normalizeBossState, maybeManifestBoss, onBossDefeated, bossHints } from './boss.js';
import { recordAchievements } from './achievements.js';
import * as Trials from './trials.js';
import { eventReward } from './events.js';
import { pillById, applyPillBuffs, cleanPillBuffs } from './alchemy.js';
import { salvageYield, essenceRepairCost, materialName } from './salvage.js';
import { saveGame, loadGame, clearSave } from './save.js';

// --- Qi (stamina) tuning. Base regen is 1 Qi/3s (~20/min, 1200/hr) so the
// stamina gate is present but not punishing; the Hall of Merit "Qi Current
// Talisman" adds FLAT Qi-per-tick on top. MAX_QI is 1000 (a large Qi battery).
export const MAX_QI = 1000;
export const QI_REGEN_MS = 3_000; // 1 Qi per 3s base, wall-clock (~20/min, 1200/hr)
const STONE_ACCRUAL_MS = 3_600_000; // spirit-stones/hour accrued per real hour (sect disciples)

// Effective Qi cap: base cap + Qi-cap bonuses from sect disciples (GDD §4.3) and
// the Hall of Merit's Qi Reservoir. Always derived so the cap tracks owned sources.
export function maxQi(player) {
  return MAX_QI + guildBuffs(player).qiCap + meritShopBonuses(player).qiCap;
}

// Effective Qi regenerated per minute, folding in the Hall of Merit flat regen
// talisman and any Titan gear per-tick bonus. Mirrors the exact math tickQi()
// uses so the HUD tooltip never drifts from reality.
export function qiPerMinute(player) {
  const perTick = 1 + gearQiRegenBonus(player) + meritShopBonuses(player).qiRegenFlat;
  return (perTick * 60_000) / QI_REGEN_MS;
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
  if (!state.player.guild) state.player.guild = { members: [] };
  if (!state.player.loadouts) state.player.loadouts = [];
  // Hall of Merit state (Wave 3 Economy): premium-shop purchases + timed Merit buffs.
  if (!state.player.meritShop) state.player.meritShop = { purchases: {}, daoHeart: null, daoHeartSwitches: 0 };
  if (!state.player.meritBuffs) state.player.meritBuffs = [];
  normalizeBossState(state.player); // create {} for new saves; migrate old single-boss shape
  if (!state.player.achievements) state.player.achievements = [];
  if (!state.player.trials) state.player.trials = { lastDay: -1, plays: 0, wins: 0 };
  if (!state.player.stats) state.player.stats = {}; // lifetime counters (task S3); keys default lazily
  if (!state.player.consumables) state.player.consumables = {}; // { pillId: qty } — Alchemy (task C)
  if (!state.player.materials) state.player.materials = {}; // { materialId: qty } — Salvage essence (task M)
  if (!state.player.pillBuffs) state.player.pillBuffs = []; // timed pill combat buffs
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
  // Sect-dispatch provider — timed disciple missions on the player, resolved by
  // wall-clock (so they complete offline like Qi regen / the Pavilion).
  state.sectMissionProvider = createSectMissionProvider(state);

  state.loadedFromSave = !!loaded;
  if (loaded) {
    const before = state.qi;
    tickQi(state); // apply offline wall-clock regen accrued while away
    state.offlineQi = state.qi - before;
    state.offlineStones = tickStones(state); // passive spirit-stone income (sect disciples)
  } else {
    addLog(state, 'You step out from the sect gate. The wilds await.');
  }
  // Rotate listings and resolve any player sales that completed while away.
  state.offlineMarket = state.marketProvider.tick();
  // Re-manifest the Ancient Terror if the player reloaded standing on its lair.
  maybeBossHint(state);
  manifestBoss(state);
  return state;
}

export function resetGame() {
  clearSave();
}

// Ascension / New Game+ (task V). A prestige reset that — unlike resetGame's
// full wipe — keeps the player's collections and grants a permanent stat bonus.
// The reset itself lives in ascension.js; here we own Qi (reset to the new cap)
// plus logging and persistence.
export function canAscendNow(state) {
  return canAscend(state.player);
}

export function ascend(state) {
  const res = performAscension(state.player);
  if (res.ok) {
    state.qi = maxQi(state.player);
    addLog(state, `✦ You ascend! Ascension ${res.ascension} — a permanent +${res.bonusPct}% to all stats. The climb begins anew.`);
    saveGame(state);
  } else if (res.reason) {
    addLog(state, res.reason);
  }
  return res;
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
  applyPillBuffs(me, p); // Alchemy (task C): pill buffs apply to the daily trial too
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
      if (p.inventory.length < effectiveInventorySize(p)) {
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

// --- Alchemy (task C, GDD §6.4): brew pills from spirit stones, quaff for an
// instant effect or a timed combat buff. Effects/expiry logic lives in
// alchemy.js; these game-layer wrappers own the economy + persistence. ---

export function brewPill(state, pillId) {
  const p = state.player;
  const pill = pillById(pillId);
  if (!pill) return { ok: false };
  if (p.level < pill.minLevel) return { ok: false, reason: `Requires cultivation stage ${pill.minLevel}.` };
  if (p.spiritStones < pill.cost) { addLog(state, 'Not enough spirit stones to brew that pill.'); return { ok: false }; }
  p.spiritStones -= pill.cost;
  if (!p.consumables) p.consumables = {};
  p.consumables[pillId] = (p.consumables[pillId] ?? 0) + 1;
  addLog(state, `Brewed a ${pill.name} (−${pill.cost} stones).`);
  saveGame(state);
  return { ok: true };
}

export function usePill(state, pillId) {
  const p = state.player;
  const pill = pillById(pillId);
  if (!pill || (p.consumables?.[pillId] ?? 0) <= 0) return { ok: false };
  p.consumables[pillId] -= 1;

  if (pill.kind === 'instant') {
    if (pill.effect.qi) {
      const before = state.qi;
      state.qi = Math.min(maxQi(p), state.qi + pill.effect.qi);
      addLog(state, `${pill.name}: restored ${state.qi - before} Qi.`);
    }
    if (pill.effect.xpPerLevel) {
      const xp = pill.effect.xpPerLevel * p.level;
      addLog(state, `${pill.name}: +${xp} cultivation XP.`);
      grantXp(state, xp);
    }
  } else {
    // Timed combat buff — refresh any existing stack of the same pill.
    if (!p.pillBuffs) p.pillBuffs = [];
    p.pillBuffs = p.pillBuffs.filter((b) => b.pillId !== pillId);
    p.pillBuffs.push({ pillId, icon: pill.icon, name: pill.name, effect: pill.effect, expiresAt: Date.now() + pill.durationMs });
    addLog(state, `${pill.name} takes effect (${Math.round(pill.durationMs / 1000)}s).`);
  }
  saveGame(state);
  return { ok: true };
}

// Drop expired pill buffs; returns true if anything changed (for a re-render).
export function tickPillBuffs(state, now = Date.now()) {
  const expired = cleanPillBuffs(state.player, now);
  for (const b of expired) addLog(state, `${b.name} fades.`);
  if (expired.length) saveGame(state);
  return expired.length > 0;
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
  // Per-tick Qi = 1 base + Titan-gear bonus + the Hall of Merit "Qi Current
  // Talisman" (a FLAT +Qi-per-tick upgrade). The interval itself is fixed.
  const perTick = 1 + gearQiRegenBonus(state.player) + meritShopBonuses(state.player).qiRegenFlat;
  const interval = QI_REGEN_MS;
  const ticks = Math.floor((now - state.lastQiTick) / interval);
  if (ticks > 0) {
    state.qi = Math.min(cap, state.qi + ticks * perTick);
    state.lastQiTick += ticks * interval;
  }
}

// Wall-clock passive income from spirit-stones/hour sect disciples (GDD §4.3:
// the same last-seen-timestamp machinery as Qi regen). Accrues whole stones and
// advances the timestamp only by the consumed portion, so fractions aren't lost.
// Returns the number of stones granted this tick.
export function tickStones(state, now = Date.now()) {
  const perHour = guildBuffs(state.player).stonesPerHour;
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
  if (state.map.at(x, y).wall) return { ok: false, reason: 'A wall blocks the way' };
  // No diagonal squeeze between two wall tiles (keeps the maze meaningful).
  if (cost === 2 && state.map.at(state.pos.x, y).wall && state.map.at(x, state.pos.y).wall) {
    return { ok: false, reason: 'A wall blocks the way' };
  }
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

function grantXp(state, xp) {
  const p = state.player;
  p.xp += xp;
  const stages = applyBreakthroughs(p);
  if (stages > 0) {
    sfx('breakthrough');
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
  applyPillBuffs(actor, state.player); // Alchemy (task C): active timed pill combat buffs

  // TITAN PURITY (doc 40 §3.1, critique §3a): resolveCombat is called exactly
  // once, exactly like any other fight — combat.js is never told a Titan exists.
  // The only wrinkle is which `hp` we hand it: a Titan's stats are fixed, but its
  // HP is the PERSISTED world pool, synced into the transient field right before
  // the call, then read back off the existing return shape right after.
  if (monster.isTitan) monster.hp = monster.titanHp;
  const result = resolveCombat(actor, monster, randomSeed());
  state.qi -= result.staminaSpent;

  const p = state.player;
  degradeEquipment(p); // gear wears with use, win or lose
  ensureSeen(state, monster.typeId); // facing a beast enters it in the codex
  Quests.onFace(state.quests, monster.typeId);

  if (monster.isTitan) {
    // World HP now reflects this encounter's chip damage. The attacker always
    // swings first each round in combat.js, so the Titan is chipped even in a
    // fight the player loses/draws — matching the ~10-encounter depletion model.
    const last = result.turns[result.turns.length - 1];
    monster.titanHp = last ? last.defenderHpAfter : monster.titanHp;
  }
  const titanDepleted = monster.isTitan && monster.titanHp <= 0;

  if (result.outcome === 'win' || titanDepleted) {
    sfx('kill'); // the foe (ordinary/rare/boss/depleted-Titan) is slain
    // Sect disciples buff battle rewards (GDD §4.3): XP and spirit-stone gain.
    const gb = guildBuffs(p);
    const force = isForceDropsOn(); // debug toggle (§4): forces Legendary/SE/normal drops to 100%
    let xp, stones, drop;
    if (monster.isBoss) {
      // The Ancient Terror (GDD §9.1): hand-authored calamity rewards plus the
      // game's first Epic/Legendary drop, resolved (and the wall-clock cooldown
      // armed) in boss.js.
      const br = onBossDefeated(state, monster, state.worldRng);
      xp = Math.round(br.xp * (1 + gb.xpPct));
      stones = Math.round(br.stones * (1 + gb.stonePct));
      drop = br.drop;
      sfx('merit');
    } else if (monster.isTitan) {
      // Titan depleted after the ~10-encounter chase: fixed authored reward paid
      // ONCE, a guaranteed (100%) Titan-item drop, and +20 Merit (fires exactly
      // here, once). The depletion sequence IS the gate — no extra roll, and the
      // force-drops toggle is a no-op for Titans.
      xp = Math.round(monster.xpReward * (1 + gb.xpPct));
      stones = Math.round(monster.stoneReward * (1 + gb.stonePct));
      drop = generateItem(state.worldRng() < 0.5 ? 'weapon' : 'robe', monster.dropLevel, 'titan', state.worldRng);
      awardMerit(p, 20);
      sfx('merit');
    } else {
      xp = Math.round(scaleXp(monster.xpReward, p.level, monster.level) * (1 + gb.xpPct));
      stones = Math.round(monster.stoneReward * (1 + gb.stonePct));
      if (monster.isSuperElite) {
        drop = (force || state.worldRng() < SUPER_ELITE_DROP_CHANCE)
          ? generateItem(state.worldRng() < 0.5 ? 'weapon' : 'robe', monster.level, 'superElite', state.worldRng) : null;
        awardMerit(p, 6);
        sfx('merit');
      } else if (monster.isLegendary) {
        drop = (force || state.worldRng() < LEGENDARY_DROP_CHANCE)
          ? generateItem(state.worldRng() < 0.5 ? 'weapon' : 'robe', monster.level, 'legendary', state.worldRng) : null;
        awardMerit(p, 2);
        sfx('merit');
      } else {
        drop = rollDrop(monster.level, state.worldRng, { forceDrop: force });
      }
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
      sfx(['legendary', 'superElite', 'titan', 'epic', 'mythic'].includes(drop.rarity) ? 'lootRare' : 'loot');
      if (p.inventory.length < effectiveInventorySize(p)) {
        p.inventory.push(drop);
        st.itemsLooted = (st.itemsLooted || 0) + 1;
        addLog(state, `Loot: ${drop.name} (Lv ${drop.level}).`);
      } else {
        addLog(state, `A ${drop.name} dropped, but your pack is full — it is lost.`);
      }
    }

    result.rewards = { xp, stones, itemDrop: drop };
    result.bossKill = monster.isBoss || undefined;
    if (monster.isTitan) result.titanProgress = { remainingHp: 0, maxHp: monster.titanMaxHp, depleted: true };
    addLog(
      state,
      monster.isBoss
        ? `${monster.name} is vanquished! +${xp} XP, +${stones} spirit stones. The calamity recedes into the deep.`
        : monster.isTitan
        ? `The ${monster.name} is felled at last! +${xp} XP, +${stones} spirit stones — a Titan artifact is yours.`
        : `Slew ${monster.name} (Lv ${monster.level}): +${xp} XP, +${stones} stones.`
    );
    grantXp(state, xp);
  } else if (result.outcome === 'loss') {
    const stonesLost = Math.floor(p.spiritStones * DEATH_STONE_LOSS);
    // Hall of Merit's "Ward Against Regression" reduces the XP lost on death.
    const xpLost = Math.floor(p.xp * DEATH_XP_LOSS * meritShopBonuses(p).xpLossMult);
    p.spiritStones -= stonesLost;
    p.xp -= xpLost;
    result.penalty = { stonesLost, xpLost };
    const st = p.stats || (p.stats = {});
    st.fightsLost = (st.fightsLost || 0) + 1;
    addLog(state, `Defeated by ${monster.name}: -${stonesLost} stones, -${xpLost} XP.`);
    // A surviving Titan bounds away to a new cell (it took chip damage even on a
    // loss). World-state only — combat.js/rewards untouched.
    if (monster.isTitan) {
      const pos = relocateTitan(state.map, tile, monster, state.worldRng);
      result.titanProgress = { remainingHp: monster.titanHp, maxHp: monster.titanMaxHp, movedTo: pos, depleted: false };
      addLog(state, `${monster.name} staggers but flees to (${pos.x}, ${pos.y})! (${Math.round(100 * monster.titanHp / monster.titanMaxHp)}% remaining)`);
    }
  } else {
    const st = p.stats || (p.stats = {});
    st.fightsDrawn = (st.fightsDrawn || 0) + 1;
    addLog(state, `Combat with ${monster.name} unresolved after ${MAX_TURNS} turns.`);
    if (monster.isTitan) {
      const pos = relocateTitan(state.map, tile, monster, state.worldRng);
      result.titanProgress = { remainingHp: monster.titanHp, maxHp: monster.titanMaxHp, movedTo: pos, depleted: false };
      addLog(state, `${monster.name} shrugs off the exchange and bounds to (${pos.x}, ${pos.y})! (${Math.round(100 * monster.titanHp / monster.titanMaxHp)}% remaining)`);
    }
  }

  result.monster = monster;
  saveGame(state);
  return result;
}

// --- Debug spawn wrappers (doc 40 §5). Pure logic lives in rarespawns.js/
// titans.js; game.js just spawns onto the player's CURRENT tile (so a tester can
// attack immediately), logs, and saves. These BYPASS the natural 1-per-zone caps
// — the author explicitly needs to spawn MULTIPLE for testing. ?dev=1-gated at
// the UI layer (debug.js only renders the bar in dev mode). ---

// Pick a native creature type for the current zone without needing map.js's
// private pickType — weighting is irrelevant for a debug spawn, so a uniform
// pick over the zone's flat spawn table suffices.
function debugPickType(state) {
  const spawns = ZONES[state.zoneId].spawns;
  return spawns[Math.floor(state.worldRng() * spawns.length)].type;
}

export function debugSpawnLegendary(state) {
  const tile = currentTile(state);
  const actor = spawnCreature(debugPickType(state), null, state.worldRng, { legendary: true, statMult: LEGENDARY_STAT_MULT });
  tile.monsters.push(actor);
  tile.clearedAt = null;
  addLog(state, `[debug] Spawned ${actor.name}.`);
  saveGame(state);
  return actor;
}

export function debugSpawnSuperElite(state) {
  const tile = currentTile(state);
  const actor = spawnCreature(debugPickType(state), null, state.worldRng, { superElite: true, statMult: SUPER_ELITE_STAT_MULT });
  tile.monsters.push(actor);
  tile.clearedAt = null;
  addLog(state, `[debug] Spawned ${actor.name}.`);
  saveGame(state);
  return actor;
}

export function debugSpawnTitan(state) {
  const actor = spawnTitanActor(state.zoneId);
  if (!actor) { addLog(state, '[debug] No Titan defined for this zone.'); return null; }
  const pos = placeTitanRandomly(state.map, actor, state.worldRng);
  addLog(state, `[debug] Spawned Titan ${actor.name} at (${pos.x}, ${pos.y}).`);
  saveGame(state);
  return actor;
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

// --- Salvage / materials (task M, GDD §5). Thin wrappers over salvage.js pure
// helpers: break a PACK artifact into spirit essence, and spend
// essence to mend an owned artifact's durability anywhere. Each persists on
// success. Equipped items can't be salvaged (guarded — only pack items). ---

export function salvageItemAction(state, itemId) {
  const p = state.player;
  const idx = p.inventory.findIndex((i) => i.id === itemId);
  if (idx === -1) return { ok: false, reason: 'not in pack' }; // equipped/unknown — refuse
  const item = p.inventory[idx];
  const y = salvageYield(item);
  if (!y) return { ok: false, reason: 'unsalvageable' };
  p.inventory.splice(idx, 1);
  if (!p.materials) p.materials = {};
  p.materials[y.materialId] = (p.materials[y.materialId] || 0) + y.qty;
  const name = materialName(y.materialId);
  addLog(state, `Salvaged ${item.name} → +${y.qty} ${name}.`);
  saveGame(state);
  return { ok: true, materialId: y.materialId, qty: y.qty, materialName: name };
}

export function essenceRepairAction(state, itemId) {
  const p = state.player;
  const item = ownedItem(p, itemId); // worn or pack
  if (!item) return { ok: false };
  const cost = essenceRepairCost(item);
  if (!cost || cost.qty === 0) return { ok: false, reason: 'full' };
  const have = (p.materials && p.materials[cost.materialId]) || 0;
  if (have < cost.qty) {
    addLog(state, `Mending ${item.name} needs ${cost.qty} ${materialName(cost.materialId)}.`);
    return { ok: false, reason: 'essence' };
  }
  p.materials[cost.materialId] -= cost.qty;
  item.durability = item.maxDurability;
  addLog(state, `Mended ${item.name} with ${cost.qty} ${materialName(cost.materialId)}.`);
  saveGame(state);
  return { ok: true, materialId: cost.materialId, qty: cost.qty };
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
  if (r.item && p.inventory.length >= effectiveInventorySize(p)) {
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
    const unit = res.currency === 'merit' ? 'Merit' : 'stones';
    addLog(
      state,
      res.toMailbox
        ? `Bought ${res.item.name} for ${res.price} ${unit} — pack full, delivered to your mailbox.`
        : `Bought ${res.item.name} for ${res.price} ${unit}.`
    );
    saveGame(state);
  } else if (res.reason) {
    addLog(state, res.reason);
  }
  return res;
}

export function marketList(state, itemId, price, currency = 'stones') {
  const res = state.marketProvider.listItem(itemId, price, currency);
  if (res.ok) {
    const unit = res.listing.currency === 'merit' ? 'Merit' : 'stones';
    addLog(state, `Listed ${res.listing.item.name} in the Treasure Pavilion for ${res.listing.price} ${unit}.`);
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
  if (res.merit) bits.push(`${res.merit} Merit`);
  if (res.items.length) bits.push(`${res.items.length} item(s)`);
  if (bits.length) addLog(state, `Collected ${bits.join(' and ')} from your mailbox.`);
  if (res.blocked) addLog(state, `${res.blocked} item(s) remain — clear pack space to collect them.`);
  if (res.stones || res.merit || res.items.length) saveGame(state);
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

// --- Sect disciple missions. Thin wrappers over the SectMissionProvider: assign
// a mission, resolve finished ones on the wall-clock tick, and collect the
// returned rewards through the shared XP/stone path. ---

export function startSectMission(state, personaId, typeId) {
  const res = state.sectMissionProvider.assign(personaId, typeId);
  if (res.ok) {
    addLog(state, `${res.discipleName} sets out on “${res.typeName}” (${res.minutes}m).`);
    saveGame(state);
  } else if (res.reason) {
    addLog(state, res.reason);
  }
  return res;
}

// Called from the wall-clock tick; moves finished missions to the returned tray.
export function tickSectMissions(state, now = Date.now()) {
  const done = state.sectMissionProvider.resolveDue(now);
  if (done.length) {
    for (const m of done) addLog(state, `${m.discipleName} returns from “${m.typeName}” — reward waiting in Sect Dispatch.`);
    saveGame(state);
  }
  return { changed: done.length > 0 };
}

export function collectSectMissions(state) {
  const res = state.sectMissionProvider.collect();
  if (res.count > 0) {
    state.player.spiritStones += res.stones;
    addLog(state, `Collected ${res.count} disciple reward(s): +${res.stones} spirit stones, +${res.xp} XP.`);
    grantXp(state, res.xp); // applies breakthroughs + logs
    saveGame(state);
  }
  return res;
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
