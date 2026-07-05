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
  rogueCultivator: {
    id: 'rogueCultivator',
    name: 'Rogue Cultivator',
    levels: [5, 6],
    base: { attack: 12, defense: 12, damage: 3, armor: 5, maxHp: 30 },
    perLevel: { attack: 1.5, defense: 1.5, damage: 0.25, armor: 0.5, maxHp: 4 },
    xp: 55,
    stones: 30,
  },
};

let creatureCounter = 0;

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

export function createPlayer() {
  const p = createActor({
    id: 'player',
    name: 'Nameless Cultivator',
    level: 1,
    attack: 12,
    defense: 8,
    damage: 9,
    armor: 3,
    maxHp: 34,
  });
  p.xp = 0;
  p.spiritStones = 20;
  return p;
}
