// Leveling & stat allocation (GDD §6.3, §9.1). Levels are cultivation stages:
// Qi Condensation 1-9 for zone 1. The XP curve is authored per-stage — later
// breakthroughs cost dramatically more — which is what delivers the intended
// "fast early, slows down" pacing rather than one smooth exponential.

export const MAX_STAGE = 9;

// Cost to break through FROM stage n to n+1.
const STAGE_XP = [0, 100, 160, 256, 410, 655, 1050, 1680, 2690];

export function xpForBreakthrough(stage) {
  return stage >= MAX_STAGE ? Infinity : STAGE_XP[stage];
}

export function stageName(stage) {
  return `Qi Condensation ${stage}`;
}

export const STAT_POINTS_PER_STAGE = 3;
export const SKILL_POINTS_PER_STAGE = 1; // banked until techniques arrive (Stage 2)

// What one allocated point buys. HP is cheaper per point so it can compete
// with offensive stats (veteran FS advice is all-in Attack/Damage; HP needs
// the discount to ever be worth picking).
export const POINT_VALUE = { attack: 1, defense: 1, damage: 1, armor: 1, hp: 4 };

export const ALLOC_STATS = ['attack', 'defense', 'damage', 'armor', 'hp'];

// --- Stat-modifier aggregation pipeline (GDD §7.3). Effective stats are
// always derived, never mutated in place: base + allocated points + gear.
// Techniques (Stage 2) and Spirit Cards (Stage 2+) plug in here later.

export function effectiveStats(player) {
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
  return eff;
}

// Combat snapshot: the plain Actor shape resolveCombat() expects. The player
// enters every fight at full effective HP (Stage 0 full-heal rule stands).
export function playerCombatActor(player) {
  const eff = effectiveStats(player);
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
