// Shared Actor schema (GDD §4.2): the player, monsters, and any future rival/PvP
// opponent are all the same shape. resolveCombat() only ever sees this shape.

// Creature templates now live per-zone under js/zones/ and are composed by the
// zone registry (task E). actors.js re-exports CREATURE_TYPES so every existing
// `import { CREATURE_TYPES } from './actors.js'` is unchanged.
import { CREATURE_TYPES } from './zones/registry.js';
export { CREATURE_TYPES };

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

// The scaled stat block a creature type presents at a given level (defaults to
// the low end of its level band). Pure derivation from the template — used by
// the Beast Codex to show combat stats without needing a live spawned instance.
export function creatureStatBlock(typeId, level) {
  const t = CREATURE_TYPES[typeId];
  const lv = level ?? t.levels[0];
  const scale = (stat) => Math.round(t.base[stat] + t.perLevel[stat] * (lv - 1));
  return {
    level: lv,
    attack: scale('attack'),
    defense: scale('defense'),
    damage: scale('damage'),
    armor: scale('armor'),
    maxHp: scale('maxHp'),
    xp: t.xp,
    stones: t.stones,
  };
}

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
    merit: 0, // premium currency (Wave 1) — earned in-game, spent in the Hall of Merit (Wave 2)
    base: { attack: 12, defense: 8, damage: 9, armor: 3, maxHp: 34 },
    allocated: { attack: 0, defense: 0, damage: 0, armor: 0, hp: 0 },
    equipment: { weapon: null, robe: null },
    inventory: [],
    bestiary: {}, // { typeId: { kills, firstSeenAt } } — GDD §7.5 Stage 1 foundations
    cards: {}, // { cardId: level } — Spirit Card collection (GDD §7.4)
    guild: { members: [] }, // hired sect disciples (persona ids) — GDD §4.3 stub
    meridians: { nodes: {} }, // opened meridian ranks (GDD §5): { nodeId: rank }; points derive from level
    loadouts: [], // saved equipment sets (GDD §6.2): [{ name, weapon, robe }]
    learnedTechniques: [], // technique ids (GDD §6.4)
    activeBuffs: [], // { techniqueId, effect, expiresAt } — timed technique buffs
    stats: {}, // lifetime counters (task S3): fightsWon/Lost/Drawn, stonesWon, itemsLooted, msPlayed
    materials: {}, // { materialId: qty } — spirit essence from salvage (task M)
    ascension: 0, // Ascension / New Game+ tier (task V): permanent +stat% per tier
  };
}
