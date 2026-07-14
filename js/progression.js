// Leveling & stat allocation (GDD §6.3, §9.1). A "level" is a global stage
// index across cultivation realms: 1-9 = Qi Condensation 1-9, 10-18 =
// Foundation Establishment 1-9, and so on. The XP curve is authored per-stage
// — later breakthroughs cost dramatically more, with a big spike at each realm
// barrier — which delivers the intended "fast early, slows down" pacing.

// Realms in ascending order; each spans `stages` sub-levels.
export const REALMS = [
  { name: 'Qi Condensation', stages: 9 },
  { name: 'Foundation Establishment', stages: 9 },
  { name: 'Core Formation', stages: 9 },
];

export const MAX_STAGE = REALMS.reduce((s, r) => s + r.stages, 0);

// Cost to break through FROM stage n to n+1. Each realm barrier (QC9 -> FE1 at
// index 9, FE9 -> CF1 at index 18) is a deliberate spike — the classic xianxia
// bottleneck — after which the new realm resumes its ~×1.4 climb.
const STAGE_XP = [
  0, // stage 0 (unused)
  100, 160, 256, 410, 655, 1050, 1680, 2690, // QC1->2 .. QC8->9
  6000, // QC9 -> FE1 (realm barrier)
  8600, 12000, 16800, 23500, 33000, 46000, 64000, 90000, // FE1->2 .. FE8->9
  200000, // FE9 -> CF1 (realm barrier — Core Formation, the great bottleneck)
  260000, 360000, 500000, 700000, 980000, 1360000, 1900000, 2650000, // CF1->2 .. CF8->9
];

export function xpForBreakthrough(stage) {
  return stage >= MAX_STAGE ? Infinity : STAGE_XP[stage];
}

export function realmFor(level) {
  let n = level;
  for (const r of REALMS) {
    if (n <= r.stages) return { realm: r.name, sub: n };
    n -= r.stages;
  }
  const last = REALMS[REALMS.length - 1];
  return { realm: last.name, sub: last.stages };
}

export function stageName(level) {
  const { realm, sub } = realmFor(level);
  return `${realm} ${sub}`;
}

export const STAT_POINTS_PER_STAGE = 3;
export const SKILL_POINTS_PER_STAGE = 1; // banked until techniques arrive (Stage 2)

// What one allocated point buys. HP is cheaper per point so it can compete
// with offensive stats (veteran FS advice is all-in Attack/Damage; HP needs
// the discount to ever be worth picking).
export const POINT_VALUE = { attack: 1, defense: 1, damage: 1, armor: 1, hp: 4 };

export const ALLOC_STATS = ['attack', 'defense', 'damage', 'armor', 'hp'];

// Ascension / New Game+ (task V): each completed ascension grants a permanent
// +8% to every effective stat, applied as the final global scalar in
// effectiveStats. Read straight off `player.ascension` (a plain integer) so
// progression.js stays free of an ascension.js import (no module cycle).
export const ASCENSION_STAT_PER_TIER = 0.08;

// --- Stat-modifier aggregation pipeline (GDD §7.3). Effective stats are
// always derived, never mutated in place:
//   base + allocated points + gear + meridians + sets + buffs.
// Gear/meridians/sets are flat additions; technique buffs are % modifiers
// applied to that flat subtotal. Every future passive source plugs in here.

import { activeBuffs } from './techniques.js';
import { meridianBonuses } from './meridians.js';
import { setBonuses } from './sets.js';

export function effectiveStats(player, now = Date.now()) {
  const eff = {
    attack: player.base.attack + player.allocated.attack * POINT_VALUE.attack,
    defense: player.base.defense + player.allocated.defense * POINT_VALUE.defense,
    damage: player.base.damage + player.allocated.damage * POINT_VALUE.damage,
    armor: player.base.armor + player.allocated.armor * POINT_VALUE.armor,
    maxHp: player.base.maxHp + player.allocated.hp * POINT_VALUE.hp,
  };
  for (const item of Object.values(player.equipment)) {
    if (!item) continue;
    for (const [stat, val] of Object.entries(item.bonuses)) {
      if (stat === 'qiRegen') continue; // Titan-gear Qi-regen is NOT a combat stat (see items.js:gearQiRegenBonus, consumed by tickQi)
      if (stat === 'hp') eff.maxHp += val;
      else eff[stat] += val;
    }
  }
  // Meridian talent tree — a flat passive source (GDD §5): permanent passives
  // opened one point per breakthrough. (Spirit Cards, formerly the third flat
  // source, were removed in the redesign — this pipeline is now
  // base+allocated → gear → meridians → sets → %buffs → ascension.)
  const merStat = meridianBonuses(player);
  for (const [stat, val] of Object.entries(merStat)) {
    if (!val) continue;
    if (stat === 'hp') eff.maxHp += val;
    else eff[stat] += val;
  }
  // Gear set bonuses — a completed weapon+robe set grants a bonus on top of the
  // pieces.
  const setStat = setBonuses(player);
  for (const [stat, val] of Object.entries(setStat)) {
    if (!val) continue;
    if (stat === 'hp') eff.maxHp += val;
    else eff[stat] += val;
  }
  // Technique buffs are percentage modifiers on the flat (gear+meridian+set) subtotal.
  for (const buff of activeBuffs(player, now)) {
    for (const [stat, pct] of Object.entries(buff.effect)) {
      const key = stat === 'hp' ? 'maxHp' : stat;
      eff[key] = Math.max(1, Math.round(eff[key] * (1 + pct)));
    }
  }
  // Ascension / New Game+ (task V): a permanent global scalar over the fully
  // resolved stats — the prestige power that makes each NG+ run stronger.
  const asc = player.ascension ?? 0;
  if (asc > 0) {
    const m = 1 + ASCENSION_STAT_PER_TIER * asc;
    for (const k of ['attack', 'defense', 'damage', 'armor', 'maxHp']) {
      eff[k] = Math.max(1, Math.round(eff[k] * m));
    }
  }
  return eff;
}

// Combat snapshot: the plain Actor shape resolveCombat() expects. The player
// enters every fight at full effective HP (Stage 0 full-heal rule stands).
export function playerCombatActor(player, now = Date.now()) {
  const eff = effectiveStats(player, now);
  return {
    id: 'player',
    name: player.name,
    level: player.level,
    stats: { attack: eff.attack, defense: eff.defense, damage: eff.damage, armor: eff.armor },
    hp: eff.maxHp,
    maxHp: eff.maxHp,
  };
}

// Consume XP into breakthroughs. Returns the number of stages gained.
export function applyBreakthroughs(player) {
  let gained = 0;
  while (player.level < MAX_STAGE && player.xp >= xpForBreakthrough(player.level)) {
    player.xp -= xpForBreakthrough(player.level);
    player.level += 1;
    player.statPoints += STAT_POINTS_PER_STAGE;
    player.skillPoints += SKILL_POINTS_PER_STAGE;
    gained += 1;
  }
  return gained;
}

export function allocateStat(player, stat) {
  if (!ALLOC_STATS.includes(stat) || player.statPoints <= 0) return false;
  player.allocated[stat] += 1;
  player.statPoints -= 1;
  return true;
}

// --- Costed stat respec (doc 30 §1.2). Pure single-file additions; the premium
// shop (Economy's meritshop.js, Wave 2) charges the cost first, then calls these.
// No new save fields — reuses statPoints/allocated (both already persisted).

// Total stat points currently invested — the cost basis a "Stat Respec" shop row
// scales against (baseCost + perPoint * statPointsSpent). Mirrors
// meridianPointsSpent/techniquePointsSpent.
export function statPointsSpent(player) {
  return ALLOC_STATS.reduce((sum, s) => sum + (player.allocated?.[s] ?? 0), 0);
}

// Refund all allocated stat points back into the unspent pool.
export function respecStats(player) {
  const refunded = statPointsSpent(player);
  player.statPoints += refunded;
  player.allocated = { attack: 0, defense: 0, damage: 0, armor: 0, hp: 0 };
  return { ok: true, refunded };
}
