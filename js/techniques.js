// Techniques (GDD §6.4). Three categories (Offense/Defense/Special), a light
// 2-3 tier dependency tree, learned once with banked technique points, then
// cast as real-time timed buffs that cost Qi. Buffs are stored as data
// (techniqueId, effect, expiresAt) generic enough that a future version could
// have one cultivator buff another (GDD §6.4 note). Effects are percentage
// modifiers so they stay relevant across the whole level range; they plug
// into the effectiveStats aggregation pipeline (GDD §7.3).

export const CATEGORIES = ['Offense', 'Defense', 'Special'];

// effect values are fractional modifiers on the pre-buff stat (base+trained+
// gear): { attack: 0.15 } = +15% Attack. Negatives are real trade-offs.
export const TECHNIQUES = {
  // --- Offense ---
  ironFist: {
    id: 'ironFist', name: 'Iron Fist Art', category: 'Offense', tier: 1,
    minStage: 1, cost: 1, prereqs: [],
    effect: { attack: 0.15 }, duration: 90_000, qiCost: 8,
    desc: 'Harden your strikes. +15% Attack.',
  },
  blazingPalm: {
    id: 'blazingPalm', name: 'Blazing Palm', category: 'Offense', tier: 2,
    minStage: 4, cost: 1, prereqs: ['ironFist'],
    effect: { damage: 0.18, attack: 0.08 }, duration: 90_000, qiCost: 12,
    desc: 'Palms wreathed in spirit-flame. +18% Damage, +8% Attack.',
  },
  heavenStrike: {
    id: 'heavenStrike', name: 'Heaven-Shaking Strike', category: 'Offense', tier: 3,
    minStage: 10, cost: 2, prereqs: ['blazingPalm'],
    effect: { attack: 0.25, damage: 0.25 }, duration: 60_000, qiCost: 20,
    desc: 'A realm-breaking blow. +25% Attack, +25% Damage.',
  },
  // --- Defense ---
  stoneSkin: {
    id: 'stoneSkin', name: 'Stone Skin Art', category: 'Defense', tier: 1,
    minStage: 1, cost: 1, prereqs: [],
    effect: { armor: 0.25 }, duration: 90_000, qiCost: 8,
    desc: 'Flesh turns to stone. +25% Armor.',
  },
  goldenBell: {
    id: 'goldenBell', name: 'Golden Bell Shield', category: 'Defense', tier: 2,
    minStage: 4, cost: 1, prereqs: ['stoneSkin'],
    effect: { defense: 0.15, armor: 0.20 }, duration: 90_000, qiCost: 12,
    desc: 'A shroud of ringing Qi. +15% Defense, +20% Armor.',
  },
  adamantBody: {
    id: 'adamantBody', name: 'Adamantine Body', category: 'Defense', tier: 3,
    minStage: 10, cost: 2, prereqs: ['goldenBell'],
    effect: { armor: 0.30, hp: 0.20 }, duration: 60_000, qiCost: 20,
    desc: 'An indestructible vessel. +30% Armor, +20% Max HP.',
  },
  // --- Special ---
  vitalMeditation: {
    id: 'vitalMeditation', name: 'Vital Meditation', category: 'Special', tier: 1,
    minStage: 3, cost: 1, prereqs: [],
    effect: { hp: 0.20 }, duration: 120_000, qiCost: 10,
    desc: 'Circulate life essence. +20% Max HP.',
  },
  berserkFervor: {
    id: 'berserkFervor', name: 'Berserk Fervor', category: 'Special', tier: 2,
    minStage: 5, cost: 2, prereqs: [],
    effect: { damage: 0.35, armor: -0.25 }, duration: 60_000, qiCost: 15,
    desc: 'Abandon defense for slaughter. +35% Damage, −25% Armor.',
  },
};

export function get(id) {
  return TECHNIQUES[id];
}

export function isLearned(player, id) {
  return (player.learnedTechniques ?? []).includes(id);
}

export function canLearn(player, id) {
  const t = TECHNIQUES[id];
  if (!t) return { ok: false };
  if (isLearned(player, id)) return { ok: false, reason: 'Already learned.' };
  if (player.level < t.minStage) return { ok: false, reason: `Requires cultivation stage ${t.minStage}.` };
  if ((player.skillPoints ?? 0) < t.cost) return { ok: false, reason: 'Not enough technique points.' };
  for (const pre of t.prereqs) {
    if (!isLearned(player, pre)) return { ok: false, reason: `Requires ${TECHNIQUES[pre].name} first.` };
  }
  return { ok: true };
}

export function learn(player, id) {
  const check = canLearn(player, id);
  if (!check.ok) return check;
  player.learnedTechniques.push(id);
  player.skillPoints -= TECHNIQUES[id].cost;
  return { ok: true };
}

export function canCast(player, qi, id) {
  const t = TECHNIQUES[id];
  if (!t) return { ok: false };
  if (!isLearned(player, id)) return { ok: false, reason: 'Not learned.' };
  if (qi < t.qiCost) return { ok: false, reason: `Need ${t.qiCost} Qi.` };
  return { ok: true };
}

// Cast (or refresh) a technique buff. Caller deducts res.cost from Qi.
export function cast(player, qi, id, now = Date.now()) {
  const check = canCast(player, qi, id);
  if (!check.ok) return check;
  const t = TECHNIQUES[id];
  if (!player.activeBuffs) player.activeBuffs = [];
  player.activeBuffs = player.activeBuffs.filter((b) => b.techniqueId !== id); // refresh
  player.activeBuffs.push({
    techniqueId: id,
    effect: t.effect,
    castAt: now,
    duration: t.duration,
    expiresAt: now + t.duration,
  });
  return { ok: true, cost: t.qiCost, duration: t.duration };
}

export function activeBuffs(player, now = Date.now()) {
  return (player.activeBuffs ?? []).filter((b) => b.expiresAt > now);
}

// Drop expired buffs, returning the ones removed (for logging).
export function cleanExpired(player, now = Date.now()) {
  const buffs = player.activeBuffs ?? [];
  const expired = buffs.filter((b) => b.expiresAt <= now);
  if (expired.length) player.activeBuffs = buffs.filter((b) => b.expiresAt > now);
  return expired;
}
