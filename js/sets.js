// Gear set bonuses (board task B, GDD §5). Certain weapon+robe pairs share a
// `setId`; wearing the whole set grants a flat "set bonus" on top of the pieces'
// own stats. With two equipment slots (weapon, robe) a set is a 2-piece pair, so
// the bonus is all-or-nothing: both pieces equipped → bonus, otherwise nothing.
// The threshold model (`bonusAt: { count: {stats} }`) is deliberately general so
// a future 3rd slot / larger sets just add higher thresholds with no code change.
//
// setBonuses(player) is the ONE add-line into progression.js effectiveStats —
// a flat stat source, after gear / meridians.
//
// This module imports nothing game-side (pure data + reads of player.equipment),
// so progression.js can import setBonuses in headless sims, and there is no cycle.

const STAT_LABELS = { attack: 'Attack', defense: 'Defense', damage: 'Damage', armor: 'Armor', hp: 'Max HP' };

// Sets are keyed by setId. `pieces` = how many members exist (the full set), and
// `bonusAt` maps an equipped-count threshold to the flat stats granted at it.
// The member item names must match items.js templates that carry the same setId.
// Magnitudes climb with the tier of the pieces (Rare < Epic < Legendary) and stay
// in-band with a good gear attribute so a completed set feels earned, not broken.
export const SETS = {
  skydancer: {
    id: 'skydancer',
    name: 'Skydancer Regalia',
    tier: 'rare',
    pieces: 2,
    members: ['Cloudpiercer Jian', 'Crane-Feather Cloak'],
    bonusAt: { 2: { attack: 4, damage: 4 } },
    flavor: 'Cloud-step and crane-glide as one — the wind never lands a blow.',
  },
  phoenix: {
    id: 'phoenix',
    name: 'Phoenix Ascendant',
    tier: 'epic',
    pieces: 2,
    members: ['Phoenix-Feather Spear', 'Phoenix-Down Robe'],
    bonusAt: { 2: { damage: 8, hp: 20, armor: 4 } },
    flavor: 'Reborn in flame — every wound rekindles the blaze.',
  },
  nineHeavens: {
    id: 'nineHeavens',
    name: 'Nine Heavens Calamity',
    tier: 'legendary',
    pieces: 2,
    members: ['Nine Calamities Sabre', 'Nine-Heavens Cloud Mantle'],
    bonusAt: { 2: { attack: 10, defense: 10, damage: 10, hp: 30 } },
    flavor: 'The nine calamities answer as one when heaven and blade align.',
  },
  // Two legendary-tier sets completing the formerly set-less legendary templates
  // (§1.2) — Legendary items ALWAYS carry a setId now.
  sunderingHeavens: {
    id: 'sunderingHeavens',
    name: 'Sundering Heavens Regalia',
    tier: 'legendary',
    pieces: 2,
    members: ['Sundering Heavens Spear', 'Dragon-Scale Imperial Robe'],
    bonusAt: { 2: { attack: 10, damage: 10, hp: 24 } },
    flavor: 'The heavens do not forgive what this pairing has already sundered.',
  },
  immortalSlaying: {
    id: 'immortalSlaying',
    name: 'Immortal-Slaying Communion',
    tier: 'legendary',
    pieces: 2,
    members: ['Immortal-Slaying Jian', 'Voidfang Vestment'],
    bonusAt: { 2: { damage: 12, defense: 8, armor: 6 } },
    flavor: 'Even the deathless learn to bleed before this blade and its ward.',
  },
  // Two Super-Elite sets (§1.3) — brand-new tier, authored set-complete. Scaled
  // above Legendary since SE drops are rarer (1/area vs. multiple/area).
  voidSovereign: {
    id: 'voidSovereign',
    name: 'Void Sovereign Dominion',
    tier: 'superElite',
    pieces: 2,
    members: ['Voidsovereign Blade', 'Voidsovereign Mantle'],
    bonusAt: { 2: { attack: 16, damage: 16, hp: 40, armor: 8 } },
    flavor: 'The void does not conquer — it simply outlasts.',
  },
  thousandThunder: {
    id: 'thousandThunder',
    name: 'Thousand-Thunder Communion',
    tier: 'superElite',
    pieces: 2,
    members: ['Thousand-Thunder Spear', 'Thousand-Thunder Raiment'],
    bonusAt: { 2: { attack: 16, defense: 16, damage: 10, hp: 36 } },
    flavor: 'A thousand thunders answered when the two were finally reunited.',
  },
};

export function setById(setId) {
  return SETS[setId] ?? null;
}

// How many of a set's pieces are currently equipped.
export function equippedSetCount(player, setId) {
  let n = 0;
  for (const item of Object.values(player.equipment ?? {})) {
    if (item && item.setId === setId) n += 1;
  }
  return n;
}

// The flat stats a set grants at a given equipped-count: the highest threshold in
// `bonusAt` that `count` meets (so larger sets with tiered bonuses aggregate the
// right tier). Returns a {stat:val} object (possibly empty).
export function setBonusAtCount(set, count) {
  let best = null;
  for (const thresh of Object.keys(set.bonusAt).map(Number).sort((a, b) => a - b)) {
    if (count >= thresh) best = set.bonusAt[thresh];
  }
  return best ?? {};
}

// Aggregate every completed/partially-completed set's active bonus across the
// player's equipped gear — the ONE add-line for effectiveStats. Tolerates old
// saves / gear without a setId (they simply contribute nothing).
export function setBonuses(player) {
  const out = { attack: 0, defense: 0, damage: 0, armor: 0, hp: 0 };
  // Which sets are represented by the currently-equipped gear.
  const seen = new Set();
  for (const item of Object.values(player.equipment ?? {})) {
    if (item && item.setId) seen.add(item.setId);
  }
  for (const setId of seen) {
    const set = SETS[setId];
    if (!set) continue;
    const bonus = setBonusAtCount(set, equippedSetCount(player, setId));
    for (const [stat, val] of Object.entries(bonus)) out[stat] += val;
  }
  return out;
}

// --- Display helpers (pure; used by ui.js item tooltip) --------------------

// A context player so the tooltip can show live "X/N pieces" without threading
// state into itemTooltip — set from renderGear, mirroring setCompareContext.
let ctxPlayer = null;
export function setSetsContext(player) {
  ctxPlayer = player;
}

function bonusText(bonus) {
  return Object.entries(bonus)
    .map(([s, v]) => `+${v} ${STAT_LABELS[s] ?? s}`)
    .join(', ');
}

// Tooltip block for an item that belongs to a set: the set name, this piece's
// members with owned/equipped ticks, live progress, and the full-set bonus
// (highlighted once active). Returns '' for non-set items.
export function setLine(item) {
  if (!item || !item.setId) return '';
  const set = SETS[item.setId];
  if (!set) return '';
  const count = ctxPlayer ? equippedSetCount(ctxPlayer, set.id) : 0;
  const complete = count >= set.pieces;
  const full = setBonusAtCount(set, set.pieces);
  const members = set.members
    .map((name) => {
      const on = ctxPlayer
        ? Object.values(ctxPlayer.equipment ?? {}).some((it) => it && it.name === name)
        : false;
      const cls = on ? 'set-member on' : 'set-member';
      return `<div class="tt-line ${cls}">${on ? '◆' : '◇'} ${name}</div>`;
    })
    .join('');
  const bonusCls = complete ? 'set-bonus active' : 'set-bonus dim';
  return `<div class="tt-line set-head">Set · ${set.name} <span class="dim">(${count}/${set.pieces})</span></div>
    ${members}
    <div class="tt-line ${bonusCls}">${set.pieces}-piece: ${bonusText(full)}${complete ? ' ✓' : ''}</div>`;
}
