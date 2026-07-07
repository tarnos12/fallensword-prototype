// Items & gear (GDD §6.1, §6.2, §6.8). Two slots for Stage 1: weapon and
// robe. The full FallenSword-adapted rarity ladder: rarity gates the NUMBER
// of attributes an item rolls (Common 1 → Mythic 5) plus a range multiplier.
// Every item comes from a named template whose per-attribute roll ranges are
// always respected. Random drops only reach Rare — Epic/Legendary/Mythic are
// reserved for hand-authored items (quests, bosses) per §6.1.

export const RARITIES = {
  common: { key: 'common', label: 'Common', mult: 1.0, attributes: 1, weight: 70, maxDurability: 30, repairPerPoint: 0.5, sellMult: 2 },
  uncommon: { key: 'uncommon', label: 'Uncommon', mult: 1.35, attributes: 2, weight: 25, maxDurability: 45, repairPerPoint: 1, sellMult: 5 },
  rare: { key: 'rare', label: 'Rare', mult: 1.8, attributes: 3, weight: 5, maxDurability: 60, repairPerPoint: 2, sellMult: 12 },
  epic: { key: 'epic', label: 'Epic', mult: 2.3, attributes: 4, weight: 0, maxDurability: 80, repairPerPoint: 3, sellMult: 30 },
  legendary: { key: 'legendary', label: 'Legendary', mult: 2.9, attributes: 5, weight: 0, maxDurability: 100, repairPerPoint: 5, sellMult: 75 },
  mythic: { key: 'mythic', label: 'Mythic', mult: 3.6, attributes: 5, weight: 0, maxDurability: 120, repairPerPoint: 8, sellMult: 180 },
};

export const INVENTORY_SIZE = 24; // testing size; 1.0 starts small per GDD §6.2
export const DROP_CHANCE = 0.22;

// Templates: ordered attribute pools with level-1 roll ranges [stat, min, max].
// The first attribute is the item's identity (a Common piece rolls only that);
// higher rarities work down the list. Item TYPES are unique per rarity — the
// name itself signals the tier (a Silversteel Dao is always Uncommon), so
// there are no rarity prefixes.
const TEMPLATES = {
  weapon: {
    common: [
      { name: 'Coarse Iron Sabre', attrs: [['damage', 1, 3], ['attack', 1, 2], ['armor', 1, 1], ['hp', 2, 4], ['defense', 1, 2]] },
      { name: 'Ashwood Spear', attrs: [['attack', 1, 3], ['damage', 1, 2], ['hp', 2, 4], ['defense', 1, 1], ['armor', 1, 1]] },
      { name: "Novice's Training Jian", attrs: [['damage', 1, 2], ['attack', 1, 3], ['defense', 1, 2], ['armor', 1, 1], ['hp', 2, 4]] },
      { name: 'Bone-Carved Dagger', attrs: [['attack', 1, 2], ['damage', 1, 2], ['defense', 1, 2], ['hp', 2, 4], ['armor', 1, 1]] },
    ],
    uncommon: [
      { name: 'Silversteel Dao', attrs: [['damage', 1, 3], ['attack', 1, 2], ['armor', 1, 1], ['hp', 2, 4], ['defense', 1, 2]] },
      { name: 'Windcutter Spear', attrs: [['attack', 1, 3], ['damage', 1, 2], ['hp', 2, 4], ['defense', 1, 1], ['armor', 1, 1]] },
      { name: 'Flowing Water Jian', attrs: [['damage', 1, 2], ['attack', 1, 3], ['defense', 1, 2], ['armor', 1, 1], ['hp', 2, 4]] },
      { name: 'Serpent-Fang Dirk', attrs: [['attack', 1, 2], ['damage', 1, 2], ['defense', 1, 2], ['hp', 2, 4], ['armor', 1, 1]] },
    ],
    rare: [
      { name: 'Thunder-Etched Blade', attrs: [['damage', 1, 3], ['attack', 1, 2], ['armor', 1, 1], ['hp', 2, 4], ['defense', 1, 2]] },
      { name: 'Moonshadow Spear', attrs: [['attack', 1, 3], ['damage', 1, 2], ['hp', 2, 4], ['defense', 1, 1], ['armor', 1, 1]] },
      { name: 'Cloudpiercer Jian', attrs: [['damage', 1, 2], ['attack', 1, 3], ['defense', 1, 2], ['armor', 1, 1], ['hp', 2, 4]] },
      { name: 'Beast-Bone Glaive', attrs: [['attack', 1, 2], ['damage', 1, 2], ['defense', 1, 2], ['hp', 2, 4], ['armor', 1, 1]] },
    ],
    epic: [
      { name: 'Dragonvein Sabre', attrs: [['damage', 1, 3], ['attack', 1, 2], ['armor', 1, 1], ['hp', 2, 4], ['defense', 1, 2]] },
      { name: 'Phoenix-Feather Spear', attrs: [['attack', 1, 3], ['damage', 1, 2], ['hp', 2, 4], ['defense', 1, 1], ['armor', 1, 1]] },
      { name: 'Starfall Jian', attrs: [['damage', 1, 2], ['attack', 1, 3], ['defense', 1, 2], ['armor', 1, 1], ['hp', 2, 4]] },
      { name: 'Demon-Subduing Halberd', attrs: [['attack', 1, 2], ['damage', 1, 2], ['defense', 1, 2], ['hp', 2, 4], ['armor', 1, 1]] },
    ],
    legendary: [
      { name: 'Nine Calamities Sabre', attrs: [['damage', 1, 3], ['attack', 1, 2], ['armor', 1, 1], ['hp', 2, 4], ['defense', 1, 2]] },
      { name: 'Sundering Heavens Spear', attrs: [['attack', 1, 3], ['damage', 1, 2], ['hp', 2, 4], ['defense', 1, 1], ['armor', 1, 1]] },
      { name: 'Immortal-Slaying Jian', attrs: [['damage', 1, 2], ['attack', 1, 3], ['defense', 1, 2], ['armor', 1, 1], ['hp', 2, 4]] },
    ],
    mythic: [
      { name: 'Dao-Severing Blade', attrs: [['damage', 1, 3], ['attack', 1, 2], ['armor', 1, 1], ['hp', 2, 4], ['defense', 1, 2]] },
      { name: "Heaven's Wrath Jian", attrs: [['damage', 1, 2], ['attack', 1, 3], ['defense', 1, 2], ['armor', 1, 1], ['hp', 2, 4]] },
      { name: 'World-Cleaving Sabre', attrs: [['attack', 1, 3], ['damage', 1, 2], ['hp', 2, 4], ['defense', 1, 1], ['armor', 1, 1]] },
    ],
  },
  robe: {
    common: [
      { name: 'Grey Disciple Robe', attrs: [['defense', 1, 3], ['armor', 1, 2], ['hp', 2, 5], ['attack', 1, 1], ['damage', 1, 1]] },
      { name: 'Woven Reed Vest', attrs: [['hp', 3, 6], ['defense', 1, 2], ['armor', 1, 1], ['attack', 1, 1], ['damage', 1, 1]] },
      { name: 'Mountain Cotton Garb', attrs: [['defense', 1, 2], ['hp', 2, 5], ['armor', 1, 2], ['damage', 1, 1], ['attack', 1, 1]] },
      { name: 'Coarse Hemp Tunic', attrs: [['armor', 1, 2], ['hp', 2, 5], ['defense', 1, 2], ['damage', 1, 1], ['attack', 1, 1]] },
    ],
    uncommon: [
      { name: 'Beast-Hide Mantle', attrs: [['armor', 1, 2], ['hp', 2, 5], ['defense', 1, 2], ['damage', 1, 1], ['attack', 1, 1]] },
      { name: 'Silkworm Cloud Robe', attrs: [['defense', 1, 3], ['armor', 1, 2], ['hp', 2, 5], ['attack', 1, 1], ['damage', 1, 1]] },
      { name: 'River-Silk Vestment', attrs: [['hp', 3, 6], ['defense', 1, 2], ['armor', 1, 1], ['attack', 1, 1], ['damage', 1, 1]] },
    ],
    rare: [
      { name: 'Spirit-Silk Raiment', attrs: [['defense', 1, 3], ['armor', 1, 2], ['hp', 2, 5], ['attack', 1, 1], ['damage', 1, 1]] },
      { name: 'Crane-Feather Cloak', attrs: [['hp', 3, 6], ['defense', 1, 2], ['armor', 1, 1], ['attack', 1, 1], ['damage', 1, 1]] },
      { name: 'Jade-Thread Robe', attrs: [['armor', 1, 2], ['hp', 2, 5], ['defense', 1, 2], ['damage', 1, 1], ['attack', 1, 1]] },
    ],
    epic: [
      { name: 'Qilin-Scale Vestment', attrs: [['armor', 1, 2], ['hp', 2, 5], ['defense', 1, 2], ['damage', 1, 1], ['attack', 1, 1]] },
      { name: 'Phoenix-Down Robe', attrs: [['defense', 1, 3], ['armor', 1, 2], ['hp', 2, 5], ['attack', 1, 1], ['damage', 1, 1]] },
      { name: 'Black Tortoise Mantle', attrs: [['hp', 3, 6], ['defense', 1, 2], ['armor', 1, 1], ['attack', 1, 1], ['damage', 1, 1]] },
    ],
    legendary: [
      { name: 'Nine-Heavens Cloud Mantle', attrs: [['defense', 1, 3], ['armor', 1, 2], ['hp', 2, 5], ['attack', 1, 1], ['damage', 1, 1]] },
      { name: 'Dragon-Scale Imperial Robe', attrs: [['armor', 1, 2], ['hp', 2, 5], ['defense', 1, 2], ['damage', 1, 1], ['attack', 1, 1]] },
    ],
    mythic: [
      { name: 'Voidsilk Shroud', attrs: [['defense', 1, 3], ['armor', 1, 2], ['hp', 2, 5], ['attack', 1, 1], ['damage', 1, 1]] },
      { name: 'Heaven-Patching Raiment', attrs: [['hp', 3, 6], ['defense', 1, 2], ['armor', 1, 1], ['attack', 1, 1], ['damage', 1, 1]] },
    ],
  },
};

let itemCounter = 0;

export function setItemCounter(n) {
  itemCounter = n;
}

export function getItemCounter() {
  return itemCounter;
}

function rollRarity(rng) {
  let roll = rng() * 100;
  for (const r of Object.values(RARITIES)) {
    roll -= r.weight;
    if (roll <= 0) return r;
  }
  return RARITIES.common;
}

// An attribute's effective range is its template range scaled by item level
// and rarity multiplier; the roll is always uniform WITHIN that range.
function scaleBound(v, level, mult) {
  return Math.max(1, Math.round(v * (1 + 0.45 * (level - 1)) * mult));
}

function rollAttr([stat, min, max], level, mult, rng) {
  const lo = scaleBound(min, level, mult);
  const hi = scaleBound(max, level, mult);
  return [stat, lo + Math.floor(rng() * (hi - lo + 1))];
}

export function generateItem(slot, level, rarityKey, rng) {
  const rarity = rarityKey ? RARITIES[rarityKey] : rollRarity(rng);
  const templates = TEMPLATES[slot][rarity.key];
  const template = templates[Math.floor(rng() * templates.length)];
  const bonuses = {};
  for (const attr of template.attrs.slice(0, rarity.attributes)) {
    const [stat, value] = rollAttr(attr, level, rarity.mult, rng);
    bonuses[stat] = (bonuses[stat] ?? 0) + value;
  }
  return {
    id: `item-${++itemCounter}`,
    slot,
    name: template.name,
    rarity: rarity.key,
    level,
    bonuses,
    durability: rarity.maxDurability,
    maxDurability: rarity.maxDurability,
  };
}

// Hand-authored named items (GDD §5): scripted rewards, NOT part of the random
// loot tables — only granted by explicit sources like the epic quest chain.
// Stats are fixed (a named reward is always the same item, unlike RNG drops),
// but the values are kept in-band for their rarity/level so they don't upset
// tuning. Durability derives from rarity like any other item.
export const NAMED_ITEMS = {
  ashenAegis: {
    slot: 'robe',
    name: 'Ashen Aegis of the Fallen',
    rarity: 'epic',
    level: 8,
    bonuses: { armor: 24, defense: 22, hp: 40, damage: 10 },
  },
  heavenSeverer: {
    slot: 'weapon',
    name: "Skyfracture, the Heaven-Severing Blade",
    rarity: 'legendary',
    level: 9,
    bonuses: { damage: 40, attack: 28, defense: 14, armor: 8, hp: 44 },
  },
};

// Mint a named item by id (deterministic stats). Returns null for an unknown id.
// Additive: scripted callers (the epic-quest reward path) use this instead of
// generateItem when a reward names a specific artifact.
export function mintNamedItem(namedId) {
  const spec = NAMED_ITEMS[namedId];
  if (!spec) return null;
  const rarity = RARITIES[spec.rarity];
  return {
    id: `item-${++itemCounter}`,
    slot: spec.slot,
    name: spec.name,
    rarity: spec.rarity,
    level: spec.level,
    bonuses: { ...spec.bonuses },
    durability: rarity.maxDurability,
    maxDurability: rarity.maxDurability,
    named: namedId,
  };
}

// TESTING ONLY (strip with the debug tooling before demo): a global multiplier
// on the loot drop chance so debug tools can crank drops without touching the
// tuned DROP_CHANCE. Defaults to 1 (no effect).
let dropMultiplier = 1;
export function setDropMultiplier(m) {
  dropMultiplier = m;
}

export function rollDrop(creatureLevel, rng) {
  if (rng() >= DROP_CHANCE * dropMultiplier) return null;
  const slot = rng() < 0.5 ? 'weapon' : 'robe';
  return generateItem(slot, creatureLevel, null, rng);
}

export function repairCost(item) {
  const missing = item.maxDurability - item.durability;
  return Math.ceil(missing * RARITIES[item.rarity].repairPerPoint);
}

export function sellValue(item) {
  return Math.max(1, item.level * RARITIES[item.rarity].sellMult);
}

// Equipped gear wears 1 durability per fight, win or lose (GDD §3: degrades
// with use). At 0 it stops granting bonuses until repaired.
export function degradeEquipment(player) {
  for (const item of Object.values(player.equipment)) {
    if (item && item.durability > 0) item.durability -= 1;
  }
}

export function equipItem(player, itemId) {
  const idx = player.inventory.findIndex((i) => i.id === itemId);
  if (idx === -1) return false;
  const item = player.inventory[idx];
  const prev = player.equipment[item.slot];
  player.inventory.splice(idx, 1);
  player.equipment[item.slot] = item;
  if (prev) player.inventory.push(prev); // swap: old piece returns to pack
  return true;
}

export function unequipItem(player, slot) {
  const item = player.equipment[slot];
  if (!item) return false;
  if (player.inventory.length >= INVENTORY_SIZE) return false; // pack full
  player.equipment[slot] = null;
  player.inventory.push(item);
  return true;
}
