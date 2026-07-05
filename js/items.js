// Items & gear (GDD §6.1, §6.2, §6.8). Two slots for Stage 1: weapon and
// robe. Rarity gates the stat ROLL RANGE, not just base stats, so two drops
// of the same rarity differ. Random drops only reach Rare — higher tiers are
// reserved for hand-authored items (quests, bosses) per §6.1.

export const RARITIES = {
  common: { key: 'common', label: 'Common', mult: 1.0, weight: 70, maxDurability: 30, repairPerPoint: 0.5, sellMult: 2 },
  uncommon: { key: 'uncommon', label: 'Uncommon', mult: 1.4, weight: 25, maxDurability: 45, repairPerPoint: 1, sellMult: 5 },
  rare: { key: 'rare', label: 'Rare', mult: 1.9, weight: 5, maxDurability: 60, repairPerPoint: 2, sellMult: 12 },
};

export const INVENTORY_SIZE = 8;
export const DROP_CHANCE = 0.22;

const WEAPON_NAMES = ['Iron Sabre', 'Ashwood Spear', "Disciple's Jian", 'Bone-Carved Dagger'];
const ROBE_NAMES = ['Grey Disciple Robe', 'Beast-Hide Mantle', 'Woven Reed Vest', 'Mountain Cotton Garb'];
const RARITY_PREFIX = { common: '', uncommon: 'Refined ', rare: 'Spirit-Forged ' };

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

// Stat budget scales with item level; rarity multiplies it; each stat rolls
// ±15% independently so same-rarity items aren't identical.
function roll(base, mult, rng) {
  return Math.max(1, Math.round(base * mult * (0.85 + rng() * 0.3)));
}

export function generateItem(slot, level, rarityKey, rng) {
  const rarity = rarityKey ? RARITIES[rarityKey] : rollRarity(rng);
  const names = slot === 'weapon' ? WEAPON_NAMES : ROBE_NAMES;
  const baseName = names[Math.floor(rng() * names.length)];
  const bonuses =
    slot === 'weapon'
      ? {
          attack: roll(1 + level * 0.8, rarity.mult, rng),
          damage: roll(1 + level * 0.6, rarity.mult, rng),
        }
      : {
          defense: roll(1 + level * 0.7, rarity.mult, rng),
          armor: roll(0.5 + level * 0.4, rarity.mult, rng),
          hp: roll(level * 2, rarity.mult, rng),
        };
  return {
    id: `item-${++itemCounter}`,
    slot,
    name: RARITY_PREFIX[rarity.key] + baseName,
    rarity: rarity.key,
    level,
    bonuses,
    durability: rarity.maxDurability,
    maxDurability: rarity.maxDurability,
  };
}

export function rollDrop(creatureLevel, rng) {
  if (rng() >= DROP_CHANCE) return null;
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
