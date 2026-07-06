// Legendary boss — the Ancient Terror (GDD §3 world-events stub, §9.1). A
// hand-authored "calamity beast": the first NAMED encounter, the first source
// of Epic/Legendary artifact drops, and the drop-source of a boss Spirit Card.
//
// Ordinary creatures are random tile spawns rolled from actors.js CREATURE_TYPES
// against a zone's weighted spawn table. The Ancient Terror is deliberately NOT
// one of those — it's a *scheduled solo encounter* (the GDD's stubbed
// "Legendary Creature" world event): it manifests at a fixed lair tile deep in
// the endgame zone, is gated behind a cultivation milestone, and — once slain —
// recedes onto a wall-clock cooldown before the calamity re-manifests. That
// gives repeatable, self-scheduling endgame content with no second player to
// trigger it, and lets its Spirit Card level up over several kills.
//
// The fight itself reuses everything: the boss is an Actor-shaped monster placed
// on its lair tile, so inspect / combat / playback / gear-degrade / bestiary all
// work unchanged. Only the REWARD path branches (game.js attack()), pulling the
// hand-authored numbers and the Epic/Legendary + boss-card rolls from here.

import { createActor } from './actors.js';
import { generateItem } from './items.js';

// Hand-authored stat block (tuned headless against Foundation-tier player stat
// sheets, per the project's headless-balance convention): an under-geared
// cultivator is crushed, a
// geared FE3 faces a real gamble (win/draw/lose), a maxed + technique-buffed
// cultivator reliably prevails. Fixed stats, not per-level scaled — a named
// calamity has authored numbers, not a template curve.
export const BOSS = {
  id: 'ancientTerror',
  typeId: 'ancientTerror', // its own bestiary/card key; never in a zone spawn table
  cardId: 'card_ancientTerror',
  name: 'Xuanming, the Ancient Terror',
  title: 'Calamity Beast',
  flavor:
    'Before the sects raised their gates, before the first mortal drew a breath of Qi, it slept beneath the Gorge. Those who woke it named it calamity. It has never learned to name them anything at all.',
  level: 15,
  stats: { attack: 39, defense: 33, damage: 25, armor: 16 },
  maxHp: 332,
  // Rewards (before sect buffs, which game.js applies like any kill).
  reward: { xp: 2500, stones: 900 },
  // The first Epic/Legendary drops in the game (§6.1 reserves top tiers for
  // hand-authored sources): a guaranteed Epic, with a chance to be Legendary.
  drop: { level: 12, legendaryChance: 0.18 },
  cardDropChance: 0.5, // its Spirit Card — far higher than a common beast's 2%
  // The lair: the deepest tile of the endgame zone (Cindervein Gorge, band 3).
  lair: { zoneId: 'cindervein', x: 9, y: 9 },
  minStage: 10, // Foundation Establishment 1 — you must cross the realm barrier
  cooldownMs: 30 * 60_000, // stub cadence (30 min): re-manifests for repeat runs
};

// Default boss-progress record, back-filled onto old saves in game.createGame.
export function emptyBossState() {
  return { defeatedAt: null, defeats: 0 };
}

function bossRecord(player) {
  if (!player.boss) player.boss = emptyBossState();
  return player.boss;
}

// A fresh Actor instance for the lair. Fixed id — only one Ancient Terror can
// stand at a time, and it's removed on defeat before any re-manifest.
export function spawnBoss() {
  const actor = createActor({
    id: 'boss-ancientTerror',
    name: BOSS.name,
    level: BOSS.level,
    attack: BOSS.stats.attack,
    defense: BOSS.stats.defense,
    damage: BOSS.stats.damage,
    armor: BOSS.stats.armor,
    maxHp: BOSS.maxHp,
  });
  actor.typeId = BOSS.typeId;
  actor.isBoss = true;
  actor.title = BOSS.title;
  // Surfaced by the generic inspect readout so the fight advertises its stakes.
  actor.xpReward = BOSS.reward.xp;
  actor.stoneReward = BOSS.reward.stones;
  return actor;
}

export function isBossLair(zoneId, x, y) {
  return zoneId === BOSS.lair.zoneId && x === BOSS.lair.x && y === BOSS.lair.y;
}

export function bossPresentOnTile(tile) {
  return !!tile && tile.monsters.some((m) => m.isBoss);
}

// Has the player crossed the realm barrier that lets the calamity notice them?
export function bossEligible(player) {
  return player.level >= BOSS.minStage;
}

// Wall-clock cooldown (same last-seen-timestamp pattern as Qi regen). A boss
// never defeated is always off cooldown (ready for its first manifestation).
export function bossCooldownRemaining(player, now = Date.now()) {
  const rec = bossRecord(player);
  if (rec.defeatedAt == null) return 0;
  return Math.max(0, BOSS.cooldownMs - (now - rec.defeatedAt));
}

export function bossOnCooldown(player, now = Date.now()) {
  return bossCooldownRemaining(player, now) > 0;
}

// Manifest the boss on its lair tile when the player is standing there, has met
// the stage gate, the calamity is off cooldown, and it isn't already present.
// Clears the tile's ordinary spawns first — the lair becomes its domain.
// Returns true if the boss manifested this call (so the game layer can announce
// it). Called from move/travel/load, mirroring maybeRespawn's placement.
export function maybeManifestBoss(state, now = Date.now()) {
  const { pos, zoneId } = state;
  if (!isBossLair(zoneId, pos.x, pos.y)) return false;
  const tile = state.map.at(pos.x, pos.y);
  if (bossPresentOnTile(tile)) return false;
  if (!bossEligible(state.player)) return false;
  if (bossOnCooldown(state.player, now)) return false;
  tile.monsters = [spawnBoss()];
  tile.clearedAt = null;
  return true;
}

// Resolve a boss kill: arm the cooldown, tally the defeat, and roll the
// hand-authored loot (a guaranteed Epic, sometimes Legendary) + the boss Spirit
// Card. Returns the reward parcel; game.js applies XP/stones/drop/card through
// its existing helpers so sect buffs, pack-full handling, and the card banner
// all behave exactly as for a normal kill.
export function onBossDefeated(state, monster, rng, now = Date.now()) {
  const rec = bossRecord(state.player);
  rec.defeatedAt = now;
  rec.defeats += 1;

  const slot = rng() < 0.5 ? 'weapon' : 'robe';
  const rarity = rng() < BOSS.drop.legendaryChance ? 'legendary' : 'epic';
  const drop = generateItem(slot, BOSS.drop.level, rarity, rng);

  const cardId = rng() < BOSS.cardDropChance ? BOSS.cardId : null;

  return { xp: BOSS.reward.xp, stones: BOSS.reward.stones, drop, cardId };
}

// A compact status object for the UI (map marker + tile-panel note).
export function bossLairStatus(state, now = Date.now()) {
  const { pos, zoneId } = state;
  const atLair = isBossLair(zoneId, pos.x, pos.y);
  const tile = state.map.at(pos.x, pos.y);
  return {
    atLair,
    present: atLair && bossPresentOnTile(tile),
    eligible: bossEligible(state.player),
    minStage: BOSS.minStage,
    cooldownLeftMs: bossCooldownRemaining(state.player, now),
    defeats: bossRecord(state.player).defeats,
  };
}
