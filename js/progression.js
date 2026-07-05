// Leveling & stat allocation (GDD §6.3, §9.1). A "level" is a global stage
// index across cultivation realms: 1-9 = Qi Condensation 1-9, 10-18 =
// Foundation Establishment 1-9, and so on. The XP curve is authored per-stage
// — later breakthroughs cost dramatically more, with a big spike at each realm
// barrier — which delivers the intended "fast early, slows down" pacing.

// Realms in ascending order; each spans `stages` sub-levels.
export const REALMS = [
  { name: 'Qi Condensation', stages: 9 },
  { name: 'Foundation Establishment', stages: 9 },
];

export const MAX_STAGE = REALMS.reduce((s, r) => s + r.stages, 0);

// Cost to break through FROM stage n to n+1. The QC9 -> FE1 jump (index 9) is
// a deliberate realm-barrier spike — the classic xianxia bottleneck.
const STAGE_XP = [
  0, // stage 0 (unused)
  100, 160, 256, 410, 655, 1050, 1680, 2690, // QC1->2 .. QC8->9
  6000, // QC9 -> FE1 (realm barrier)
  8600, 12000, 16800, 23500, 33000, 46000, 64000, 90000, // FE1->2 .. FE8->9
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
// always derived, never mutated in place: base + allocated points + gear +
// active technique buffs. Spirit Cards (Stage 2+) will plug in here too.

import { activeBuffs } from './techniques.js';

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
  // Technique buffs are percentage modifiers on the gear-inclusive subtotal.
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
