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
  // Two Wave-2 explicit-only tiers (weight 0 — never randomly rolled; reached
  // only via generateItem(slot, level, 'superElite'|'titan', rng) from the
  // Legendary/SE/Titan drop branches in game.js attack()). superElite sits
  // between legendary and mythic on the raw power curve (rarer monster = better
  // loot). titan is deliberately NOT slotted as "better than Mythic": its
  // defining trait is the guaranteed qiRegen line (§1.4), not stat supremacy.
  superElite: { key: 'superElite', label: 'Super Elite', mult: 3.25, attributes: 5, weight: 0, maxDurability: 110, repairPerPoint: 6, sellMult: 130 },
  titan: { key: 'titan', label: 'Titan', mult: 3.10, attributes: 4, weight: 0, maxDurability: 110, repairPerPoint: 6, sellMult: 140 },
  mythic: { key: 'mythic', label: 'Mythic', mult: 3.6, attributes: 5, weight: 0, maxDurability: 120, repairPerPoint: 8, sellMult: 180 },
};

export const INVENTORY_SIZE = 12; // small starting pack per GDD §6.2
export const DROP_CHANCE = 0.22;

// The full equippable slot list (item variety pass). weapon + robe were the
// only Stage-1 slots; helm/gloves/boots/ring/amulet round the paper-doll out
// to 7. Exported so every module that needs to enumerate "every slot"
// (progression.js effectiveStats, sets.js, and the UI's gear grids) has one
// canonical order instead of re-typing the list.
export const EQUIPMENT_SLOTS = ['weapon', 'robe', 'helm', 'gloves', 'boots', 'ring', 'amulet'];

// Effective pack size: the base plus the Hall of Merit "Pack Expansion" upgrade
// (+2 slots per purchase, Wave 3 Economy). Reads meritShop purchases directly to
// avoid an items.js -> meritshop.js import cycle. (The task sketched
// `player.packSlots`, but purchases actually live under player.meritShop.)
export function effectiveInventorySize(player) {
  return INVENTORY_SIZE + (player?.meritShop?.purchases?.packSlots ?? 0) * 2;
}

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
      { name: 'Cloudpiercer Jian', setId: 'skydancer', attrs: [['damage', 1, 2], ['attack', 1, 3], ['defense', 1, 2], ['armor', 1, 1], ['hp', 2, 4]] },
      { name: 'Beast-Bone Glaive', attrs: [['attack', 1, 2], ['damage', 1, 2], ['defense', 1, 2], ['hp', 2, 4], ['armor', 1, 1]] },
    ],
    epic: [
      { name: 'Dragonvein Sabre', attrs: [['damage', 1, 3], ['attack', 1, 2], ['armor', 1, 1], ['hp', 2, 4], ['defense', 1, 2]] },
      { name: 'Phoenix-Feather Spear', setId: 'phoenix', attrs: [['attack', 1, 3], ['damage', 1, 2], ['hp', 2, 4], ['defense', 1, 1], ['armor', 1, 1]] },
      { name: 'Starfall Jian', attrs: [['damage', 1, 2], ['attack', 1, 3], ['defense', 1, 2], ['armor', 1, 1], ['hp', 2, 4]] },
      { name: 'Demon-Subduing Halberd', attrs: [['attack', 1, 2], ['damage', 1, 2], ['defense', 1, 2], ['hp', 2, 4], ['armor', 1, 1]] },
    ],
    legendary: [
      { name: 'Nine Calamities Sabre', setId: 'nineHeavens', attrs: [['damage', 1, 3], ['attack', 1, 2], ['armor', 1, 1], ['hp', 2, 4], ['defense', 1, 2]] },
      // "Legendary items ALWAYS Sets" (§1.2): the two formerly set-less legendary
      // weapons now pair 1:1 with the new legendary robes below.
      { name: 'Sundering Heavens Spear', setId: 'sunderingHeavens', attrs: [['attack', 1, 3], ['damage', 1, 2], ['hp', 2, 4], ['defense', 1, 1], ['armor', 1, 1]] },
      { name: 'Immortal-Slaying Jian', setId: 'immortalSlaying', attrs: [['damage', 1, 2], ['attack', 1, 3], ['defense', 1, 2], ['armor', 1, 1], ['hp', 2, 4]] },
    ],
    // Super Elite weapons (§1.3) — always Sets, authored set-complete. Rarer than
    // Legendary, so their loot reads a cut above.
    superElite: [
      { name: 'Voidsovereign Blade', setId: 'voidSovereign', attrs: [['damage', 2, 4], ['attack', 2, 3], ['defense', 1, 2], ['armor', 1, 2], ['hp', 3, 5]] },
      { name: 'Thousand-Thunder Spear', setId: 'thousandThunder', attrs: [['attack', 2, 4], ['damage', 2, 3], ['hp', 3, 5], ['defense', 1, 2], ['armor', 1, 2]] },
    ],
    // Titan weapons (§1.4) — NEVER a Set (no setId), and attrs[0] is ALWAYS
    // 'qiRegen' so the guaranteed Qi-regen line rolls (generateItem slices
    // attrs.slice(0, RARITIES.titan.attributes=4) ≥ 1). qiRegen lives only in
    // item.bonuses and is aggregated by gearQiRegenBonus, not effectiveStats.
    titan: [
      { name: 'Titanheart Warhammer', attrs: [['qiRegen', 1, 2], ['damage', 2, 4], ['attack', 1, 3], ['armor', 1, 2], ['hp', 3, 5]] },
      { name: 'Colossus-Rending Axe', attrs: [['qiRegen', 1, 2], ['attack', 2, 4], ['damage', 1, 3], ['defense', 1, 2], ['hp', 3, 5]] },
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
      { name: 'Crane-Feather Cloak', setId: 'skydancer', attrs: [['hp', 3, 6], ['defense', 1, 2], ['armor', 1, 1], ['attack', 1, 1], ['damage', 1, 1]] },
      { name: 'Jade-Thread Robe', attrs: [['armor', 1, 2], ['hp', 2, 5], ['defense', 1, 2], ['damage', 1, 1], ['attack', 1, 1]] },
    ],
    epic: [
      { name: 'Qilin-Scale Vestment', attrs: [['armor', 1, 2], ['hp', 2, 5], ['defense', 1, 2], ['damage', 1, 1], ['attack', 1, 1]] },
      { name: 'Phoenix-Down Robe', setId: 'phoenix', attrs: [['defense', 1, 3], ['armor', 1, 2], ['hp', 2, 5], ['attack', 1, 1], ['damage', 1, 1]] },
      { name: 'Black Tortoise Mantle', attrs: [['hp', 3, 6], ['defense', 1, 2], ['armor', 1, 1], ['attack', 1, 1], ['damage', 1, 1]] },
    ],
    legendary: [
      { name: 'Nine-Heavens Cloud Mantle', setId: 'nineHeavens', attrs: [['defense', 1, 3], ['armor', 1, 2], ['hp', 2, 5], ['attack', 1, 1], ['damage', 1, 1]] },
      // §1.2: Dragon-Scale Imperial Robe now completes the Sundering Heavens set;
      // Voidfang Vestment is a NEW robe completing the Immortal-Slaying set, so
      // the 3 legendary weapons and 3 legendary robes pair 1:1.
      { name: 'Dragon-Scale Imperial Robe', setId: 'sunderingHeavens', attrs: [['armor', 1, 2], ['hp', 2, 5], ['defense', 1, 2], ['damage', 1, 1], ['attack', 1, 1]] },
      { name: 'Voidfang Vestment', setId: 'immortalSlaying', attrs: [['defense', 1, 3], ['armor', 1, 2], ['hp', 2, 5], ['attack', 1, 1], ['damage', 1, 1]] },
    ],
    // Super Elite robes (§1.3) — always Sets, pairing with the SE weapons above.
    superElite: [
      { name: 'Voidsovereign Mantle', setId: 'voidSovereign', attrs: [['defense', 2, 4], ['armor', 2, 3], ['hp', 3, 6], ['attack', 1, 2], ['damage', 1, 2]] },
      { name: 'Thousand-Thunder Raiment', setId: 'thousandThunder', attrs: [['hp', 4, 7], ['defense', 2, 3], ['armor', 1, 2], ['attack', 1, 2], ['damage', 1, 2]] },
    ],
    // Titan robes (§1.4) — NEVER a Set; attrs[0] ALWAYS 'qiRegen'.
    titan: [
      { name: 'Titanhide Mantle', attrs: [['qiRegen', 1, 2], ['armor', 2, 4], ['hp', 4, 7], ['defense', 1, 2], ['attack', 1, 2]] },
      { name: 'Colossus-Bound Wrap', attrs: [['qiRegen', 1, 2], ['defense', 2, 4], ['hp', 4, 7], ['armor', 1, 2], ['damage', 1, 2]] },
    ],
    mythic: [
      { name: 'Voidsilk Shroud', attrs: [['defense', 1, 3], ['armor', 1, 2], ['hp', 2, 5], ['attack', 1, 1], ['damage', 1, 1]] },
      { name: 'Heaven-Patching Raiment', attrs: [['hp', 3, 6], ['defense', 1, 2], ['armor', 1, 1], ['attack', 1, 1], ['damage', 1, 1]] },
    ],
  },

  // --- New Stage-1 slots (item variety pass). Random drops (rollDrop) only
  // ever roll common/uncommon/rare (RARITIES weights above 0 top out at
  // rare), so these five slots only need those three tiers — there is no
  // epic/legendary/mythic/superElite/titan drop path for them (those stay
  // weapon+robe, per the hand-authored Sets living there). Two named
  // templates per rarity, same shape as weapon/robe: a 5-entry attrs pool,
  // sliced to `rarity.attributes` by generateItem.
  helm: {
    common: [
      { name: 'Cloth Disciple Cap', attrs: [['armor', 1, 2], ['hp', 1, 3], ['defense', 1, 1], ['attack', 1, 1], ['damage', 1, 1]] },
      { name: 'Bronze-Studded Casque', attrs: [['defense', 1, 2], ['armor', 1, 1], ['hp', 1, 3], ['attack', 1, 1], ['damage', 1, 1]] },
    ],
    uncommon: [
      { name: 'Silver Guardian Helm', attrs: [['armor', 1, 2], ['hp', 1, 3], ['defense', 1, 1], ['attack', 1, 1], ['damage', 1, 1]] },
      { name: 'Beast-Horn Headpiece', attrs: [['defense', 1, 2], ['armor', 1, 1], ['hp', 1, 3], ['attack', 1, 1], ['damage', 1, 1]] },
    ],
    rare: [
      { name: 'Nine Dragons Coronet', attrs: [['armor', 1, 2], ['hp', 1, 3], ['defense', 1, 1], ['attack', 1, 1], ['damage', 1, 1]] },
      { name: 'Stormward Helm', attrs: [['defense', 1, 2], ['armor', 1, 1], ['hp', 1, 3], ['attack', 1, 1], ['damage', 1, 1]] },
    ],
  },
  gloves: {
    common: [
      { name: 'Frayed Wrap Gloves', attrs: [['defense', 1, 2], ['armor', 1, 1], ['hp', 1, 3], ['attack', 1, 1], ['damage', 1, 1]] },
      { name: 'Coarse Leather Gauntlets', attrs: [['armor', 1, 2], ['defense', 1, 1], ['hp', 1, 3], ['attack', 1, 1], ['damage', 1, 1]] },
    ],
    uncommon: [
      { name: 'Silverthread Gauntlets', attrs: [['defense', 1, 2], ['armor', 1, 1], ['hp', 1, 3], ['attack', 1, 1], ['damage', 1, 1]] },
      { name: 'Iron Knuckle Wraps', attrs: [['armor', 1, 2], ['defense', 1, 1], ['hp', 1, 3], ['attack', 1, 1], ['damage', 1, 1]] },
    ],
    rare: [
      { name: 'Thunderfist Gauntlets', attrs: [['defense', 1, 2], ['armor', 1, 1], ['hp', 1, 3], ['attack', 1, 1], ['damage', 1, 1]] },
      { name: 'Jade Serpent Gloves', attrs: [['armor', 1, 2], ['defense', 1, 1], ['hp', 1, 3], ['attack', 1, 1], ['damage', 1, 1]] },
    ],
  },
  boots: {
    common: [
      { name: 'Straw Sandal Boots', attrs: [['hp', 1, 3], ['armor', 1, 1], ['defense', 1, 2], ['attack', 1, 1], ['damage', 1, 1]] },
      { name: 'Hemp-Wrapped Treads', attrs: [['hp', 1, 3], ['defense', 1, 2], ['armor', 1, 1], ['attack', 1, 1], ['damage', 1, 1]] },
    ],
    uncommon: [
      { name: 'Windstep Boots', attrs: [['hp', 1, 3], ['armor', 1, 1], ['defense', 1, 2], ['attack', 1, 1], ['damage', 1, 1]] },
      { name: 'Beasthide Treads', attrs: [['hp', 1, 3], ['defense', 1, 2], ['armor', 1, 1], ['attack', 1, 1], ['damage', 1, 1]] },
    ],
    rare: [
      { name: 'Cloudtreader Boots', attrs: [['hp', 1, 3], ['armor', 1, 1], ['defense', 1, 2], ['attack', 1, 1], ['damage', 1, 1]] },
      { name: 'Stormrunner Greaves', attrs: [['hp', 1, 3], ['defense', 1, 2], ['armor', 1, 1], ['attack', 1, 1], ['damage', 1, 1]] },
    ],
  },
  ring: {
    common: [
      { name: 'Copper Band Ring', attrs: [['attack', 1, 2], ['damage', 1, 2], ['hp', 1, 2], ['defense', 1, 1], ['armor', 1, 1]] },
      { name: 'Simple Jade Loop', attrs: [['damage', 1, 2], ['attack', 1, 2], ['hp', 1, 2], ['defense', 1, 1], ['armor', 1, 1]] },
    ],
    uncommon: [
      { name: 'Silver Crescent Ring', attrs: [['attack', 1, 2], ['damage', 1, 2], ['hp', 1, 2], ['defense', 1, 1], ['armor', 1, 1]] },
      { name: 'Beast-Fang Ring', attrs: [['damage', 1, 2], ['attack', 1, 2], ['hp', 1, 2], ['defense', 1, 1], ['armor', 1, 1]] },
    ],
    rare: [
      { name: 'Thunderbind Ring', attrs: [['attack', 1, 2], ['damage', 1, 2], ['hp', 1, 2], ['defense', 1, 1], ['armor', 1, 1]] },
      { name: "Serpent's Coil Ring", attrs: [['damage', 1, 2], ['attack', 1, 2], ['hp', 1, 2], ['defense', 1, 1], ['armor', 1, 1]] },
    ],
  },
  amulet: {
    common: [
      { name: 'Wooden Talisman', attrs: [['damage', 1, 2], ['attack', 1, 2], ['hp', 1, 2], ['defense', 1, 1], ['armor', 1, 1]] },
      { name: 'Bone Pendant', attrs: [['attack', 1, 2], ['damage', 1, 2], ['hp', 1, 2], ['defense', 1, 1], ['armor', 1, 1]] },
    ],
    uncommon: [
      { name: 'Silver Spirit Charm', attrs: [['damage', 1, 2], ['attack', 1, 2], ['hp', 1, 2], ['defense', 1, 1], ['armor', 1, 1]] },
      { name: 'Jade Guardian Pendant', attrs: [['attack', 1, 2], ['damage', 1, 2], ['hp', 1, 2], ['defense', 1, 1], ['armor', 1, 1]] },
    ],
    rare: [
      { name: 'Ninefold Thunder Amulet', attrs: [['damage', 1, 2], ['attack', 1, 2], ['hp', 1, 2], ['defense', 1, 1], ['armor', 1, 1]] },
      { name: 'Phoenix Ember Pendant', attrs: [['attack', 1, 2], ['damage', 1, 2], ['hp', 1, 2], ['defense', 1, 1], ['armor', 1, 1]] },
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
    ...(template.setId ? { setId: template.setId } : {}), // gear set membership (task B)
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
  // Stormcrown saga (Core Formation endgame, GDD §5): the mid-chain reward,
  // granted for facing the Stormscale Wyrm. Legendary tier, level scaled to
  // the wyrm's band (22-24) — a proportional scale-up of ashenAegis's shape
  // (defense/armor/hp-heavy robe with a modest damage line).
  stormsovereignRaiment: {
    slot: 'robe',
    name: "Stormsovereign's Raiment",
    rarity: 'legendary',
    level: 21,
    bonuses: { armor: 72, defense: 66, hp: 120, damage: 30 },
  },
  // Stormcrown saga capstone: the game's first Mythic item, granted for
  // reaching Core Formation 7 (level 25). A proportional scale-up of
  // heavenSeverer's offense-forward shape (damage/attack near the top of
  // band, defense/armor kept modest).
  stormreaver: {
    slot: 'weapon',
    name: 'Stormreaver, the Ninefold Thunder Blade',
    rarity: 'mythic',
    level: 25,
    bonuses: { damage: 127, attack: 89, defense: 45, armor: 26, hp: 140 },
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

// Slot weights for a NORMAL (rarity-rolled) drop. weapon+robe stay the
// majority (70%) since they're the two slots with a full rarity ladder and
// Set membership; the five new slots split the rest evenly (6% each). Only
// rollDrop consults this — the Legendary/SE/Titan drop branches in
// game.js:attack() call generateItem('weapon'|'robe', ...) directly and are
// untouched by this table.
const DROP_SLOT_WEIGHTS = [
  ['weapon', 35], ['robe', 35], ['helm', 6], ['gloves', 6], ['boots', 6], ['ring', 6], ['amulet', 6],
];

function pickDropSlot(rng) {
  let roll = rng() * 100;
  for (const [slot, w] of DROP_SLOT_WEIGHTS) {
    roll -= w;
    if (roll <= 0) return slot;
  }
  return 'weapon';
}

export function rollDrop(creatureLevel, rng, opts = {}) {
  // opts.forceDrop (debug 100%-drop toggle, §4) skips the drop gate. Backward-
  // compatible: every existing caller omits opts and keeps the DROP_CHANCE gate.
  if (!opts.forceDrop && rng() >= DROP_CHANCE) return null;
  const slot = pickDropSlot(rng);
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
  if (player.inventory.length >= effectiveInventorySize(player)) return false; // pack full
  player.equipment[slot] = null;
  player.inventory.push(item);
  return true;
}

// Qi-regen bonus from equipped gear — a Wave-2 Titan-gear hook. Deliberately
// kept OUT of effectiveStats (qiRegen is not a combat stat); its ONLY consumer
// is game.js:tickQi. Returns 0 for all current gear (no item carries a qiRegen
// bonus yet), so it is a no-op until Titan items land. Mirrors the *Bonuses()
// convention of sets.js. Broken gear grants nothing.
export function gearQiRegenBonus(player) {
  let bonus = 0;
  for (const item of Object.values(player.equipment ?? {})) {
    if (item && item.durability > 0 && item.bonuses?.qiRegen) bonus += item.bonuses.qiRegen;
  }
  return bonus;
}
