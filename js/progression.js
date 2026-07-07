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

// --- Stat-modifier aggregation pipeline (GDD §7.3). Effective stats are
// always derived, never mutated in place:
//   base + allocated points + gear + Spirit Cards + active technique buffs.
// Gear and cards are flat additions; technique buffs are percentage modifiers
// applied to that flat subtotal. Every future passive source plugs in here.

import { activeBuffs } from './techniques.js';
import { cardBonuses } from './cards.js';
import { meridianBonuses } from './meridians.js';
import { socketBonuses } from './sockets.js';

export function effectiveStats(player, now = Date.now()) {
  const eff = {
    attack: player.base.attack + player.allocated.attack * POINT_VALUE.attack,
    defense: player.base.defense + player.allocated.defense * POINT_VALUE.defense,
    damage: player.base.damage + player.allocated.damage * POINT_VALUE.damage,
    armor: player.base.armor + player.allocated.armor * POINT_VALUE.armor,
    maxHp: player.base.maxHp + player.allocated.hp * POINT_VALUE.hp,
  };
  for (const item of Object.values(player.equipment)) {
    if (!item || item.durability <= 0) continue; // broken gear grants nothing
    for (const [stat, val] of Object.entries(item.bonuses)) {
      if (stat === 'hp') eff.maxHp += val;
      else eff[stat] += val;
    }
  }
  // Spirit Cards are the third flat source (GDD §7.3): always-on, no equipping.
  const cardStat = cardBonuses(player).stat;
  for (const [stat, val] of Object.entries(cardStat)) {
    if (!val) continue;
    if (stat === 'hp') eff.maxHp += val;
    else eff[stat] += val;
  }
  // Meridian talent tree — the fourth flat source (GDD §5): permanent passives
  // opened one point per breakthrough.
  const merStat = meridianBonuses(player);
  for (const [stat, val] of Object.entries(merStat)) {
    if (!val) continue;
    if (stat === 'hp') eff.maxHp += val;
    else eff[stat] += val;
  }
  // Socketed gems — the fifth flat source (task U): gems slotted into equipped
  // gear. Broken gear's gems lie dormant (socketBonuses honours the durability rule).
  const socketStat = socketBonuses(player);
  for (const [stat, val] of Object.entries(socketStat)) {
    if (!val) continue;
    if (stat === 'hp') eff.maxHp += val;
    else eff[stat] += val;
  }
  // Technique buffs are percentage modifiers on the flat (gear+card+meridian+socket) subtotal.
  for (const buff of activeBuffs(player, now)) {
    for (const [stat, pct] of Object.entries(buff.effect)) {
      const key = stat === 'hp' ? 'maxHp' : stat;
      eff[key] = Math.max(1, Math.round(eff[key] * (1 + pct)));
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
