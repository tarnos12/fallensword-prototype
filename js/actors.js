// Shared Actor schema (GDD §4.2): the player, monsters, and any future rival/PvP
// opponent are all the same shape. resolveCombat() only ever sees this shape.

export function createActor({ id, name, level, attack, defense, damage, armor, maxHp }) {
  return {
    id,
    name,
    level,
    stats: { attack, defense, damage, armor },
    hp: maxHp,
    maxHp,
  };
}

// --- Creature templates (Stage 0: three types, per-level stat scaling) ---

export const CREATURE_TYPES = {
  wolfSpirit: {
    id: 'wolfSpirit',
    name: 'Ravenous Wolf Spirit',
    levels: [1, 2],
    base: { attack: 7, defense: 5, damage: 4, armor: 1, maxHp: 12 },
    perLevel: { attack: 1.5, defense: 1, damage: 1, armor: 0.5, maxHp: 3 },
    xp: 8,
    stones: 5,
  },
  boneSerpent: {
    id: 'boneSerpent',
    name: 'Bone Serpent',
    levels: [3, 4],
    base: { attack: 9, defense: 7, damage: 5, armor: 2, maxHp: 16 },
    perLevel: { attack: 1.5, defense: 1, damage: 1, armor: 0.5, maxHp: 3 },
    xp: 22,
    stones: 12,
  },
  // Deliberately a defensive wall at Stage 0 stats: a level-1 player can
  // neither kill it nor be killed fast, so fights hit the 20-turn draw —
  // the "this foe is beyond you" signal (GDD §8.3).
  // Deliberately a defensive wall at Stage 0 stats: a level-1 player can
  // neither kill it nor be killed fast, so fights hit the 20-turn draw —
  // the "this foe is beyond you" signal (GDD §8.3).
  rogueCultivator: {
    id: 'rogueCultivator',
    name: 'Rogue Cultivator',
    levels: [5, 6],
    base: { attack: 12, defense: 12, damage: 3, armor: 5, maxHp: 30 },
    perLevel: { attack: 1.5, defense: 1.5, damage: 0.25, armor: 0.5, maxHp: 4 },
    xp: 55,
    stones: 30,
  },

  // --- Zone 2: Cindervein Gorge (Foundation Establishment tier). `base` is
  // the level-1 baseline; effective stats are base + perLevel*(level-1), so
  // these are tuned to land at the intended values at each creature's own
  // level band (verified in the zone-2 balance sim). ---
  // Band 1, farmable from arrival (~QC4-5): a fast striker with low defenses.
  emberHound: {
    id: 'emberHound',
    name: 'Ember Hound',
    levels: [7, 8],
    base: { attack: 5, defense: 9, damage: 3, armor: 1, maxHp: 18 },
    perLevel: { attack: 1, defense: 1, damage: 1, armor: 0.3, maxHp: 4 },
    xp: 90,
    stones: 45,
  },
  // Band 2, mid wall: tanky armor/HP that better gear grinds down.
  cinderGolem: {
    id: 'cinderGolem',
    name: 'Cinder Golem',
    levels: [9, 10],
    base: { attack: 6, defense: 10, damage: 4, armor: 3, maxHp: 25 },
    perLevel: { attack: 1, defense: 1, damage: 0.8, armor: 0.5, maxHp: 5 },
    xp: 150,
    stones: 80,
  },
  // Band 3 wall: high defense + armor; under-geared cultivators draw against
  // it the way QC1 players drew against the Rogue Cultivator. The FE1 quest
  // weapon is what cracks it.
  ashenRevenant: {
    id: 'ashenRevenant',
    name: 'Ashen Revenant',
    levels: [11, 12],
    base: { attack: 8, defense: 10, damage: 5, armor: 3, maxHp: 30 },
    perLevel: { attack: 1, defense: 1.2, damage: 0.5, armor: 0.6, maxHp: 5 },
    xp: 240,
    stones: 130,
  },
};

let creatureCounter = 0;

export function setCreatureCounter(n) {
  creatureCounter = n;
}

export function getCreatureCounter() {
  return creatureCounter;
}

export function spawnCreature(typeId, level, rng) {
  const t = CREATURE_TYPES[typeId];
  const lv = level ?? t.levels[Math.floor(rng() * t.levels.length)];
  const scale = (stat) => Math.round(t.base[stat] + t.perLevel[stat] * (lv - 1));
  const actor = createActor({
    id: `${typeId}-${++creatureCounter}`,
    name: t.name,
    level: lv,
    attack: scale('attack'),
    defense: scale('defense'),
    damage: scale('damage'),
    armor: scale('armor'),
    maxHp: scale('maxHp'),
  });
  actor.typeId = typeId;
  actor.xpReward = Math.round(t.xp * (1 + 0.35 * (lv - t.levels[0])));
  actor.stoneReward = Math.round(t.stones * (1 + 0.35 * (lv - t.levels[0])));
  return actor;
}

// The player is Actor-shaped for combat via playerCombatActor(), but the
// persistent object separates base stats from allocated points and gear so
// effective stats are always derivable (GDD §7.3 aggregation pipeline).
export function createPlayer() {
  return {
    id: 'player',
    name: 'Nameless Cultivator',
    level: 1,
    xp: 0,
    statPoints: 0,
    skillPoints: 0,
    spiritStones: 20,
    base: { attack: 12, defense: 8, damage: 9, armor: 3, maxHp: 34 },
    allocated: { attack: 0, defense: 0, damage: 0, armor: 0, hp: 0 },
    equipment: { weapon: null, robe: null },
    inventory: [],
    bestiary: {}, // { typeId: { kills, firstSeenAt } } — GDD §7.5 Stage 1 foundations
    learnedTechniques: [], // technique ids (GDD §6.4)
    activeBuffs: [], // { techniqueId, effect, expiresAt } — timed technique buffs
  };
}
