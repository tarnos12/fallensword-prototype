// Legendary bosses — hand-authored "calamity beasts" (GDD §3 world-events stub,
// §5, §9.1). Each is a NAMED encounter and a source of Epic/Legendary artifact
// drops. (Spirit Cards were removed in the redesign — bosses no longer drop a
// card.)
//
// Ordinary creatures are random tile spawns rolled from actors.js CREATURE_TYPES
// against a zone's weighted spawn table. A calamity is deliberately NOT one of
// those — it's a *scheduled solo encounter* (the GDD's stubbed "Legendary
// Creature" world event): it manifests at a fixed lair tile, is gated behind a
// cultivation milestone, and — once slain — recedes onto a wall-clock cooldown
// before re-manifesting. That gives repeatable, self-scheduling endgame content
// with no second player to trigger it, and lets each card level up over kills.
//
// Bosses are DATA: the BOSSES registry below holds one entry per calamity and
// every function here operates over it, so a new boss is a new data block (+ its
// card in cards.js) — no new logic. The fight reuses everything: a boss is an
// Actor-shaped monster on its lair tile, so inspect / combat / playback /
// gear-degrade / bestiary all work unchanged; only the REWARD path branches
// (game.js attack()), pulling the hand-authored numbers + rolls from here.

import { createActor } from './actors.js';
import { generateItem } from './items.js';

// Each stat block is hand-authored and headless-tuned against player sheets at
// the boss's gate realm: an under-geared cultivator is crushed, a mid-tier player
// faces a real win/draw/loss gamble, a maxed + technique-buffed cultivator
// reliably prevails. Fixed stats, not per-level scaled — a named calamity has
// authored numbers, not a template curve.
export const BOSSES = {
  // Boss #1 — the endgame's first calamity, gated at Foundation Establishment 1.
  ancientTerror: {
    id: 'ancientTerror',
    typeId: 'ancientTerror', // its own bestiary key; never in a zone spawn table
    name: 'Xuanming, the Ancient Terror',
    title: 'Calamity Beast',
    flavor:
      'Before the sects raised their gates, before the first mortal drew a breath of Qi, it slept beneath the Gorge. Those who woke it named it calamity. It has never learned to name them anything at all.',
    level: 15,
    stats: { attack: 37, defense: 31, damage: 24, armor: 15 },
    maxHp: 315,
    reward: { xp: 2500, stones: 900 },
    drop: { level: 12, legendaryChance: 0.18 },
    lair: { zoneId: 'cindervein', x: 9, y: 9 }, // deepest tile of the endgame zone
    lairHint: 'the deepest reach of the Gorge',
    minStage: 10, // Foundation Establishment 1 — you must cross the realm barrier
    cooldownMs: 30 * 60_000,
  },
  // Boss #2 — a tougher flame-calamity gated at Foundation Establishment 5. A wall
  // for FE5, a genuine gamble for FE7, a reliable win for a maxed FE9 cultivator.
  emberCalamity: {
    id: 'emberCalamity',
    typeId: 'emberCalamity',
    name: 'Zhulong, the Ember Calamity',
    title: 'Calamity Beast',
    flavor:
      'A torch-dragon that drank the first fire and never slept again. It coils in the coal-dark heart of the Gorge, and where it breathes, even ash learns to burn. The Ashen Revenants are only what it leaves behind.',
    level: 18,
    stats: { attack: 53, defense: 42, damage: 35, armor: 21 },
    maxHp: 450,
    reward: { xp: 5200, stones: 1800 },
    drop: { level: 15, legendaryChance: 0.3 },
    lair: { zoneId: 'cindervein', x: 0, y: 9 }, // opposite band-3 corner from the Terror
    lairHint: 'the coal-dark far corner of the Gorge',
    minStage: 14, // Foundation Establishment 5
    cooldownMs: 45 * 60_000,
  },
  // Boss #3 — the Core Formation calamity, gated at Core Formation 5. A being of
  // congealed heavenly tribulation that haunts the storm-wracked summit of
  // Stormcrown Peak (js/zones/thunderpeak.js). Crushes a fresh CF5 arrival, a real
  // gamble for a prepared CF7 adept, a reliable win only for a maxed + buffed CF9
  // cultivator. The game's FIRST Mythic-drop source: a guaranteed Legendary that
  // upgrades to Mythic on a 30% roll (one notch above Zhulong's Epic→Legendary),
  // expressed through onBossDefeated's baseRarity/upgradeRarity drop path.
  tribulationSovereign: {
    id: 'tribulationSovereign',
    typeId: 'tribulationSovereign',
    name: 'Jiuxiao, the Tribulation Sovereign',
    title: 'Calamity Beast',
    flavor:
      'When a cultivator dares to form their golden core, heaven answers with lightning. Ten thousand tribulations have shattered upon this summit, and their thunder never dispersed — it pooled in the thin air, took the shape of a crowned serpent of white fire, and learned to hunger. It is the calamity that guards the last step before immortality.',
    level: 25,
    stats: { attack: 98, defense: 55, damage: 64, armor: 27 },
    maxHp: 750,
    reward: { xp: 12000, stones: 3600 },
    drop: { level: 24, baseRarity: 'legendary', upgradeRarity: 'mythic', upgradeChance: 0.3 },
    lair: { zoneId: 'thunderpeak', x: 9, y: 9 }, // storm-wracked summit, opposite the (0,0) Cloudgate portal
    lairHint: 'the storm-wracked summit of the Peak',
    minStage: 23, // Core Formation 5 — the golden-core barrier's own guardian
    cooldownMs: 60 * 60_000,
  },
};

export const BOSS_LIST = Object.values(BOSSES);

// --- Per-boss progress lives on `player.boss`, keyed by boss id:
//   { [bossId]: { defeatedAt, defeats, hintShown } }.
// Old single-boss saves stored a flat { defeatedAt, defeats } — migrated forward
// lazily the first time a record is read (no VERSION bump; the reshape is
// idempotent and touches only this field). ---

// Normalize player.boss on load: create it for new players, and migrate the
// legacy single-boss shape ({defeatedAt, defeats}) → keyed-by-id. Idempotent.
export function normalizeBossState(player) {
  if (!player.boss) {
    player.boss = {};
    return;
  }
  if ('defeatedAt' in player.boss || 'defeats' in player.boss) {
    player.boss = {
      ancientTerror: {
        defeatedAt: player.boss.defeatedAt ?? null,
        defeats: player.boss.defeats ?? 0,
        hintShown: player.boss.hintShown ?? false,
      },
    };
  }
}

function bossRecord(player, bossId) {
  normalizeBossState(player);
  if (!player.boss[bossId]) player.boss[bossId] = { defeatedAt: null, defeats: 0, hintShown: false };
  return player.boss[bossId];
}

// A fresh Actor instance for a boss's lair. Fixed id per boss — only one of each
// can stand at a time, and it's removed on defeat before any re-manifest.
export function spawnBoss(boss) {
  const actor = createActor({
    id: `boss-${boss.id}`,
    name: boss.name,
    level: boss.level,
    attack: boss.stats.attack,
    defense: boss.stats.defense,
    damage: boss.stats.damage,
    armor: boss.stats.armor,
    maxHp: boss.maxHp,
  });
  actor.typeId = boss.typeId;
  actor.isBoss = true;
  actor.title = boss.title;
  // Surfaced by the generic inspect readout so the fight advertises its stakes.
  actor.xpReward = boss.reward.xp;
  actor.stoneReward = boss.reward.stones;
  return actor;
}

// The boss whose lair is this tile, if any.
export function bossAtLair(zoneId, x, y) {
  return BOSS_LIST.find((b) => b.lair.zoneId === zoneId && b.lair.x === x && b.lair.y === y) ?? null;
}

export function isBossLair(zoneId, x, y) {
  return !!bossAtLair(zoneId, x, y);
}

export function bossPresentOnTile(tile) {
  return !!tile && tile.monsters.some((m) => m.isBoss);
}

// Has the player crossed the realm barrier that lets this calamity notice them?
export function bossEligible(player, boss) {
  return player.level >= boss.minStage;
}

// Wall-clock cooldown (same last-seen-timestamp pattern as Qi regen). A boss
// never defeated is always off cooldown (ready for its first manifestation).
export function bossCooldownRemaining(player, boss, now = Date.now()) {
  const rec = bossRecord(player, boss.id);
  if (rec.defeatedAt == null) return 0;
  return Math.max(0, boss.cooldownMs - (now - rec.defeatedAt));
}

export function bossOnCooldown(player, boss, now = Date.now()) {
  return bossCooldownRemaining(player, boss, now) > 0;
}

export function bossDefeats(player, boss) {
  return bossRecord(player, boss.id).defeats;
}

// Manifest the boss whose lair the player is standing on, when they've met its
// stage gate, it's off cooldown, and it isn't already present. Clears the tile's
// ordinary spawns first — the lair becomes its domain. Returns the boss that
// manifested (so the caller can name it), else null. Called from move/travel/load.
export function maybeManifestBoss(state, now = Date.now()) {
  const boss = bossAtLair(state.zoneId, state.pos.x, state.pos.y);
  if (!boss) return null;
  const tile = state.map.at(state.pos.x, state.pos.y);
  if (bossPresentOnTile(tile)) return null;
  if (!bossEligible(state.player, boss)) return null;
  if (bossOnCooldown(state.player, boss, now)) return null;
  tile.monsters = [spawnBoss(boss)];
  tile.clearedAt = null;
  return boss;
}

// One-time breadcrumbs pointing an eligible cultivator toward each lair in the
// current zone. Returns the hint strings to log (marking each shown), so the game
// layer stays a thin caller.
export function bossHints(state) {
  const out = [];
  for (const boss of BOSS_LIST) {
    if (boss.lair.zoneId !== state.zoneId) continue;
    if (state.player.level < boss.minStage) continue;
    const rec = bossRecord(state.player, boss.id);
    if (rec.hintShown) continue;
    rec.hintShown = true;
    out.push(
      `A dread pressure bleeds from ${boss.lairHint}, near (${boss.lair.x}, ${boss.lair.y}). ${boss.name} has taken notice of you.`
    );
  }
  return out;
}

// Resolve a boss kill: arm that boss's cooldown, tally the defeat, and roll its
// hand-authored loot (a guaranteed Epic, sometimes Legendary). Returns the reward
// parcel (or null if the monster isn't a known boss); game.js applies
// XP/stones/drop through its existing helpers so sect buffs and pack-full
// handling behave exactly as for a normal kill.
export function onBossDefeated(state, monster, rng, now = Date.now()) {
  const boss = BOSSES[monster.typeId];
  if (!boss) return null;
  const rec = bossRecord(state.player, boss.id);
  rec.defeatedAt = now;
  rec.defeats += 1;

  const slot = rng() < 0.5 ? 'weapon' : 'robe';
  // Drop rarity: a guaranteed base rarity that upgrades one notch on a roll. The
  // legacy shape ({ legendaryChance }) means base Epic → Legendary; a boss may
  // instead name its own pair explicitly (e.g. base Legendary → Mythic) via
  // { baseRarity, upgradeRarity, upgradeChance }. Defaults preserve the old two.
  const d = boss.drop;
  const baseRarity = d.baseRarity ?? 'epic';
  const upgradeRarity = d.upgradeRarity ?? 'legendary';
  const upgradeChance = d.upgradeChance ?? d.legendaryChance ?? 0;
  const rarity = rng() < upgradeChance ? upgradeRarity : baseRarity;
  const drop = generateItem(slot, boss.drop.level, rarity, rng);

  return { xp: boss.reward.xp, stones: boss.reward.stones, drop };
}

// A compact status object for the UI (map marker + tile-panel note) for the boss
// whose lair the player is currently on.
export function bossLairStatus(state, now = Date.now()) {
  const boss = bossAtLair(state.zoneId, state.pos.x, state.pos.y);
  if (!boss) return { atLair: false };
  const tile = state.map.at(state.pos.x, state.pos.y);
  return {
    atLair: true,
    boss,
    present: bossPresentOnTile(tile),
    eligible: bossEligible(state.player, boss),
    minStage: boss.minStage,
    cooldownLeftMs: bossCooldownRemaining(state.player, boss, now),
    defeats: bossDefeats(state.player, boss),
  };
}
