// Azuremist Vale — the starting zone (Qi Condensation tier). This file is the
// single home for everything data-driven about the zone: its grid/danger/spawn
// definition AND the creature templates native to it. The zone registry
// (js/zones/registry.js) composes these into the global ZONES / CREATURE_TYPES.
// Adding a new zone is a new file like this one plus one line in the registry.
//
// Pure data — no imports, so it can never form a cycle with actors/map.

// Creatures native to Azuremist. Shape matches the shared creature template:
// { id, name, cardId, flavor, levels, base, perLevel, xp, stones }. `base` is
// the level-1 baseline; effective stats are base + perLevel*(level-1).
export const CREATURES = [
  {
    id: 'wolfSpirit',
    name: 'Ravenous Wolf Spirit',
    cardId: 'card_wolfSpirit',
    flavor: 'A pack-beast whose spirit refused the wheel of reincarnation. It hunts the living for the warmth it lost.',
    levels: [1, 2],
    base: { attack: 7, defense: 5, damage: 4, armor: 1, maxHp: 12 },
    perLevel: { attack: 1.5, defense: 1, damage: 1, armor: 0.5, maxHp: 3 },
    xp: 8,
    stones: 5,
  },
  {
    id: 'boneSerpent',
    name: 'Bone Serpent',
    cardId: 'card_boneSerpent',
    flavor: 'Grave-soil coils into the shape of a serpent where too many cultivators have died. Its bite carries the chill of the tomb.',
    levels: [3, 4],
    base: { attack: 9, defense: 7, damage: 5, armor: 2, maxHp: 16 },
    perLevel: { attack: 1.5, defense: 1, damage: 1, armor: 0.5, maxHp: 3 },
    xp: 22,
    stones: 12,
  },
  // Deliberately a defensive wall at Stage 0 stats: a level-1 player can neither
  // kill it nor be killed fast, so fights hit the 20-turn draw — the "this foe is
  // beyond you" signal (GDD §8.3).
  {
    id: 'rogueCultivator',
    name: 'Rogue Cultivator',
    cardId: 'card_rogueCultivator',
    flavor: 'A disciple who forsook their sect for a faster path. Heavily warded and patient, they wait for the unwary to overreach.',
    levels: [5, 6],
    base: { attack: 12, defense: 12, damage: 3, armor: 5, maxHp: 30 },
    perLevel: { attack: 1.5, defense: 1.5, damage: 0.25, armor: 0.5, maxHp: 4 },
    xp: 55,
    stones: 30,
  },
];

// The zone definition (GDD §3, §6.6). `start` is the safe haven; `wallDensity`
// sets how mazey the dungeon layout is; `spawns` is ONE flat weighted table used
// across every floor tile (no danger scaling — fixed roster per zone); `portals`
// connect zones (looked up by position, not stored per-tile).
export const ZONE = {
  id: 'azuremist',
  name: 'Azuremist Vale',
  size: 10,
  realm: 'Qi Condensation',
  start: { x: 0, y: 0 },
  startLabel: 'Sect Gate',
  wallDensity: 0.24, // the gentlest maze — a forgiving starter vale
  // Flat roster: any floor tile can spawn any of the vale's beasts — the wolf is
  // common, the serpent frequent, and the warded rogue a rare hard wall.
  spawns: [
    { type: 'wolfSpirit', weight: 5 },
    { type: 'boneSerpent', weight: 3 },
    { type: 'rogueCultivator', weight: 1 },
  ],
  portals: [
    // Set deep in the vale (not the corner) so the player threads the maze to
    // reach it; gated at QC4. Arrival lands on the Gorge Outpost haven.
    { x: 7, y: 6, to: 'cindervein', entryX: 0, entryY: 0, minStage: 4 },
  ],
};
