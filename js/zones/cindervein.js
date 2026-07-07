// Cindervein Gorge — the second zone (Foundation Establishment tier). Zone
// definition + its native creatures, in one file (see azuremist.js for the
// pattern). Pure data; the registry composes it into ZONES / CREATURE_TYPES.

// Creatures native to Cindervein. `base` is the level-1 baseline; effective
// stats are base + perLevel*(level-1), tuned to land at the intended values at
// each creature's own level band (verified in the zone-2 balance sim).
export const CREATURES = [
  // Band 1, farmable from arrival (~QC4-5): a fast striker with low defenses.
  {
    id: 'emberHound',
    name: 'Ember Hound',
    cardId: 'card_emberHound',
    flavor: 'Born in the coal-fires of the Gorge, it burns through its own life to strike fast. Fragile, but it hits before you are ready.',
    levels: [7, 8],
    base: { attack: 5, defense: 9, damage: 3, armor: 1, maxHp: 18 },
    perLevel: { attack: 1, defense: 1, damage: 1, armor: 0.3, maxHp: 4 },
    xp: 90,
    stones: 45,
  },
  // Band 2, mid wall: tanky armor/HP that better gear grinds down.
  {
    id: 'cinderGolem',
    name: 'Cinder Golem',
    cardId: 'card_cinderGolem',
    flavor: 'Slag and spirit-ash bound by a dead forge-master\'s will. It does not tire, and it does not hurry.',
    levels: [9, 10],
    base: { attack: 6, defense: 10, damage: 4, armor: 3, maxHp: 25 },
    perLevel: { attack: 1, defense: 1, damage: 0.8, armor: 0.5, maxHp: 5 },
    xp: 150,
    stones: 80,
  },
  // Band 3 wall: high defense + armor; under-geared cultivators draw against it
  // the way QC1 players drew against the Rogue Cultivator. The FE1 quest weapon
  // is what cracks it.
  {
    id: 'ashenRevenant',
    name: 'Ashen Revenant',
    cardId: 'card_ashenRevenant',
    flavor: 'What remains when a cultivator burns their own foundation for one last breakthrough — and fails. Armoured in grief, slow to fall.',
    levels: [11, 12],
    base: { attack: 8, defense: 10, damage: 5, armor: 3, maxHp: 30 },
    perLevel: { attack: 1, defense: 1.2, damage: 0.5, armor: 0.6, maxHp: 5 },
    xp: 240,
    stones: 130,
  },
];

export const ZONE = {
  id: 'cindervein',
  name: 'Cindervein Gorge',
  size: 10,
  realm: 'Foundation Establishment',
  start: { x: 0, y: 0 },
  startLabel: 'Gorge Outpost',
  bands: [
    { max: 3, band: 1 },
    { max: 6, band: 2 },
    { max: Infinity, band: 3 },
  ],
  spawns: {
    1: [{ type: 'emberHound', weight: 1 }],
    2: [
      { type: 'emberHound', weight: 1 },
      { type: 'cinderGolem', weight: 2 },
    ],
    3: [
      { type: 'cinderGolem', weight: 1 },
      { type: 'ashenRevenant', weight: 2 },
    ],
  },
  portals: [
    { x: 0, y: 0, to: 'azuremist', entryX: 9, entryY: 9, minStage: 0 },
  ],
};
