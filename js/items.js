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

// --- Crafting & Forge (GDD §5). Additive helpers the Forge (js/crafting.js)
// drives: find an item's source template, reroll its stat values within the same
// rarity/level ("reforge"), or raise its level and scale its stats up
// ("upgrade"). Costs live here alongside sellValue/repairCost. ---

export const MAX_FORGE_LEVEL = 20;

// The template an item rolled from — needed to re-roll its exact attribute set.
export function templateFor(item) {
  return (TEMPLATES[item.slot]?.[item.rarity] ?? []).find((t) => t.name === item.name) ?? null;
}

// Reroll an item's stat values in place, using its own template/rarity/level:
// same attributes, fresh rolls (chase a better spread). Returns true on success.
export function reforgeItem(item, rng) {
  const template = templateFor(item);
  if (!template) return false;
  const rarity = RARITIES[item.rarity];
  const bonuses = {};
  for (const attr of template.attrs.slice(0, rarity.attributes)) {
    const [stat, value] = rollAttr(attr, item.level, rarity.mult, rng);
    bonuses[stat] = (bonuses[stat] ?? 0) + value;
  }
  item.bonuses = bonuses;
  return true;
}

export function canUpgradeItem(item) {
  return item.level < MAX_FORGE_LEVEL;
}

// Raise an item one level, scaling its stats by the same per-level factor
// generateItem uses — so a well-rolled piece stays proportionally well-rolled.
export function upgradeItem(item) {
  if (!canUpgradeItem(item)) return false;
  const ratio = (1 + 0.45 * item.level) / (1 + 0.45 * (item.level - 1));
  for (const stat of Object.keys(item.bonuses)) {
    item.bonuses[stat] = Math.max(1, Math.round(item.bonuses[stat] * ratio));
  }
  item.level += 1;
  return true;
}

// Forge costs (spirit stones). Reforge is a flat-ish reroll fee; upgrade scales
// with the target level so higher-tier tempering is a real sink.
export function reforgeCost(item) {
  return Math.max(10, Math.round(RARITIES[item.rarity].sellMult * (item.level + 4)));
}

export function upgradeCost(item) {
  return Math.round(RARITIES[item.rarity].sellMult * (item.level + 1) * 1.5);
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
