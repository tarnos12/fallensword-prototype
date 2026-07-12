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

// opts (Wave 2, additive — 3-arg callers are unchanged): a stat multiplier +
// rare-spawn flags for Legendary / Super-Elite variants. A Legendary/SE monster
// is the SAME native creature (same typeId → codex/quests untouched), just
// stat-multiplied and flagged. Each rare-spawn carries BOTH a boolean flag
// (game.js attack() branches on it) AND a plain `tier` string (external
// consumers like Economy's Merit hook check monster.tier), set together here.
export function spawnCreature(typeId, level, rng, opts = {}) {
  const t = CREATURE_TYPES[typeId];
  const lv = level ?? t.levels[Math.floor(rng() * t.levels.length)];
  const mult = opts.statMult ?? 1;
  const scale = (stat) => Math.round((t.base[stat] + t.perLevel[stat] * (lv - 1)) * mult);
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
  actor.xpReward = Math.round(t.xp * (1 + 0.35 * (lv - t.levels[0])) * mult);
  actor.stoneReward = Math.round(t.stones * (1 + 0.35 * (lv - t.levels[0])) * mult);
  if (opts.legendary) { actor.isLegendary = true; actor.tier = 'legendary'; actor.name = `Legendary ${actor.name}`; }
  if (opts.superElite) { actor.isSuperElite = true; actor.tier = 'superElite'; actor.name = `Super Elite ${actor.name}`; }
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
