// Spirit Cards (GDD §7.2, §7.4). Every creature type has one card with a small
// per-kill drop chance, rolled SEPARATELY from the loot roll so a card never
// replaces an item drop. Collected cards grant always-on passive bonuses — no
// equipping, no slots; the collection itself is the power. Duplicates upgrade
// the card (level 1 → maxLevel, bonus scales per level); a copy beyond max
// converts to a small spirit-stone payout (the grind-longevity lever, §7.2).
//
// Combat-stat cards feed the effectiveStats aggregation pipeline (§7.3) — the
// third passive source after gear and techniques. Meta cards (Qi cap, spirit
// stones/hour) drive the wall-clock economy through the game layer. The
// bonusType enum is deliberately extensible: XP%, repair discount, extra
// inventory slots, drop-rate% etc. slot in later with no schema change.

// Which bonusTypes route through effectiveStats (combat) vs the game layer (meta).
export const STAT_BONUS_TYPES = ['attack', 'defense', 'damage', 'armor', 'hp'];

// One card per demo-zone creature (GDD §7.5 Stage 2 scope: first two zones).
// creatureName is denormalized so this module stays import-free (no cycle with
// actors.js, which references these ids back via CREATURE_TYPES[].cardId).
export const CARDS = {
  card_wolfSpirit: { id: 'card_wolfSpirit', creatureId: 'wolfSpirit', creatureName: 'Ravenous Wolf Spirit', bonusType: 'attack', perLevel: 1, maxLevel: 5, dropChance: 0.02 },
  card_boneSerpent: { id: 'card_boneSerpent', creatureId: 'boneSerpent', creatureName: 'Bone Serpent', bonusType: 'damage', perLevel: 1, maxLevel: 5, dropChance: 0.02 },
  card_rogueCultivator: { id: 'card_rogueCultivator', creatureId: 'rogueCultivator', creatureName: 'Rogue Cultivator', bonusType: 'armor', perLevel: 1, maxLevel: 5, dropChance: 0.02 },
  card_emberHound: { id: 'card_emberHound', creatureId: 'emberHound', creatureName: 'Ember Hound', bonusType: 'qiCap', perLevel: 20, maxLevel: 5, dropChance: 0.02 },
  card_cinderGolem: { id: 'card_cinderGolem', creatureId: 'cinderGolem', creatureName: 'Cinder Golem', bonusType: 'stones', perLevel: 10, maxLevel: 5, dropChance: 0.02 },
  card_ashenRevenant: { id: 'card_ashenRevenant', creatureId: 'ashenRevenant', creatureName: 'Ashen Revenant', bonusType: 'hp', perLevel: 4, maxLevel: 5, dropChance: 0.02 },
  // Stormcrown Peak — the Core Formation zone (js/zones/thunderpeak.js). CF-tier
  // cards run one notch above the FE cards (combat +2 vs +1, meta stones +15 vs
  // +10) to match the realm's power step, still well short of the boss cards (+3).
  card_galewingRoc: { id: 'card_galewingRoc', creatureId: 'galewingRoc', creatureName: 'Galewing Roc', bonusType: 'attack', perLevel: 2, maxLevel: 5, dropChance: 0.02 },
  card_stormscaleWyrm: { id: 'card_stormscaleWyrm', creatureId: 'stormscaleWyrm', creatureName: 'Stormscale Wyrm', bonusType: 'stones', perLevel: 15, maxLevel: 5, dropChance: 0.02 },
  card_celestialWarden: { id: 'card_celestialWarden', creatureId: 'celestialWarden', creatureName: 'Celestial Warden', bonusType: 'hp', perLevel: 6, maxLevel: 5, dropChance: 0.02 },
  // Boss card (GDD §7.2, §9.1): dropped by the Ancient Terror (js/boss.js — its
  // own encounter, not a zone spawn). A deliberately potent combat-stat card
  // (+3 Damage/level vs a common beast's +1) to make the legendary kill feel
  // like a power spike. Its high dropChance is the boss's own roll, not a tile
  // roll; it's held here so the codex/collection totals and cardForCreature stay
  // uniform with every other card.
  card_ancientTerror: { id: 'card_ancientTerror', creatureId: 'ancientTerror', creatureName: 'Xuanming, the Ancient Terror', bonusType: 'damage', perLevel: 3, maxLevel: 5, dropChance: 0.5 },
  // Second boss card — the Ember Calamity (js/boss.js). A potent +3 Attack/level
  // (complements the Ancient Terror's +Damage), same boss-roll drop shape.
  card_emberCalamity: { id: 'card_emberCalamity', creatureId: 'emberCalamity', creatureName: 'Zhulong, the Ember Calamity', bonusType: 'attack', perLevel: 3, maxLevel: 5, dropChance: 0.5 },
  // Third boss card — the Tribulation Sovereign (js/boss.js, Core Formation gate).
  // A potent +3 Defense/level, completing the boss-card trio's spread (the first
  // two grant offense — Damage + Attack — so this one wards). Same boss-roll shape.
  card_tribulationSovereign: { id: 'card_tribulationSovereign', creatureId: 'tribulationSovereign', creatureName: 'Jiuxiao, the Tribulation Sovereign', bonusType: 'defense', perLevel: 3, maxLevel: 5, dropChance: 0.5 },
};

const BY_CREATURE = {};
for (const c of Object.values(CARDS)) BY_CREATURE[c.creatureId] = c;

// Beyond-max duplicate payout (GDD §7.2): later copies convert to spirit stones.
export const DUPLICATE_STONE_PAYOUT = 25;

export function cardForCreature(typeId) {
  return BY_CREATURE[typeId] ?? null;
}

export function isStatBonus(card) {
  return STAT_BONUS_TYPES.includes(card.bonusType);
}

const STAT_LABELS = { attack: 'Attack', defense: 'Defense', damage: 'Damage', armor: 'Armor', hp: 'Max HP' };

// Human-readable bonus for a card at a given level (level 0/1 => per-level value).
export function cardBonusText(card, level = 1) {
  const v = card.perLevel * Math.max(1, level);
  switch (card.bonusType) {
    case 'qiCap': return `+${v} max Qi`;
    case 'stones': return `+${v} spirit stones / hour`;
    default: return `+${v} ${STAT_LABELS[card.bonusType] ?? card.bonusType}`;
  }
}

// A separate-from-loot roll (GDD §7.2): returns a cardId on success, else null.
export function rollCardDrop(typeId, rng) {
  const card = cardForCreature(typeId);
  if (!card) return null;
  return rng() < card.dropChance ? card.id : null;
}

// Aggregate every owned card into flat stat bonuses (fed into effectiveStats)
// and meta bonuses (applied by the game layer). Level is clamped to maxLevel.
export function cardBonuses(player) {
  const stat = { attack: 0, defense: 0, damage: 0, armor: 0, hp: 0 };
  const meta = { qiCap: 0, stones: 0 };
  const cards = player.cards ?? {};
  for (const [cardId, level] of Object.entries(cards)) {
    const card = CARDS[cardId];
    if (!card || level <= 0) continue;
    const val = card.perLevel * Math.min(level, card.maxLevel);
    if (isStatBonus(card)) stat[card.bonusType] += val;
    else meta[card.bonusType] = (meta[card.bonusType] ?? 0) + val;
  }
  return { stat, meta };
}

export function ownedCardCount(player) {
  return Object.values(player.cards ?? {}).filter((lv) => lv > 0).length;
}

// Apply a dropped card to the collection. Returns a result describing what
// happened so the game layer can log it and award any duplicate payout.
export function acquireCard(player, cardId) {
  if (!player.cards) player.cards = {};
  const card = CARDS[cardId];
  if (!card) return { kind: 'none' };
  const cur = player.cards[cardId] ?? 0;
  if (cur === 0) {
    player.cards[cardId] = 1;
    return { kind: 'new', card, level: 1 };
  }
  if (cur < card.maxLevel) {
    player.cards[cardId] = cur + 1;
    return { kind: 'upgrade', card, level: cur + 1 };
  }
  return { kind: 'duplicate', card, level: cur, stones: DUPLICATE_STONE_PAYOUT };
}
