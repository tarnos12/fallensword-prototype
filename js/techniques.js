// Active abilities (GDD §6.4, reshaped per doc 30 §3). Wave 2 collapses the old
// 9-technique / 4-tier prereq chain down to 4 flat, long-duration Qi-cost
// buffs — one per stat-focus, no dependency graph. Gating is flat
// `minStage`-only (no `tier`/`prereqs` fields at all). Effects are fixed
// percentage modifiers so they stay proportionally meaningful across the
// whole level range without needing per-tier escalation.
//
// Buffs are stored as data (techniqueId, effect, expiresAt) and plug into the
// same effectiveStats aggregation pipeline (GDD §7.3) as before — this is a
// retune of the existing mechanism, not a new one. cast() still refreshes
// (never stacks): re-casting an ability resets its clock, it does not extend
// or double its effect.

export const CATEGORIES = ['Offense', 'Defense', 'Special'];

// effect values are fractional modifiers on the pre-buff stat (base+trained+
// gear): { attack: 0.20 } = +20% Attack. Negatives are real trade-offs.
export const TECHNIQUES = {
  ironFistArt: {
    id: 'ironFistArt', name: 'Iron Fist Art', category: 'Offense',
    minStage: 1, cost: 2,
    effect: { attack: 0.20, damage: 0.20 }, duration: 720_000, qiCost: 24,
    desc: 'Harden strikes into an unbroken current. +20% Attack, +20% Damage for 12 minutes.',
  },
  adamantineWard: {
    id: 'adamantineWard', name: 'Adamantine Ward', category: 'Defense',
    minStage: 1, cost: 2,
    effect: { defense: 0.20, armor: 0.25, hp: 0.15 }, duration: 720_000, qiCost: 24,
    desc: 'A standing shroud of ringing Qi. +20% Defense, +25% Armor, +15% Max HP for 12 minutes.',
  },
  vitalCirculation: {
    id: 'vitalCirculation', name: 'Vital Circulation', category: 'Special',
    minStage: 5, cost: 2,
    effect: { hp: 0.30 }, duration: 900_000, qiCost: 16,
    desc: 'Circulate life essence in a slow, safe current. +30% Max HP for 15 minutes.',
  },
  berserkFervor: {
    id: 'berserkFervor', name: 'Berserk Fervor', category: 'Special',
    minStage: 8, cost: 2,
    effect: { damage: 0.35, armor: -0.20 }, duration: 600_000, qiCost: 20,
    desc: 'Abandon defense for slaughter. +35% Damage, −20% Armor for 10 minutes.',
  },
};

export function get(id) {
  return TECHNIQUES[id];
}

export function isLearned(player, id) {
  return (player.learnedTechniques ?? []).includes(id);
}

// Flat minStage-only gating — no prereq chain to walk (doc 30 §3.1).
export function canLearn(player, id) {
  const t = TECHNIQUES[id];
  if (!t) return { ok: false };
  if (isLearned(player, id)) return { ok: false, reason: 'Already learned.' };
  if (player.level < t.minStage) return { ok: false, reason: `Requires cultivation stage ${t.minStage}.` };
  if ((player.skillPoints ?? 0) < t.cost) return { ok: false, reason: 'Not enough skill points.' };
  return { ok: true };
}

export function learn(player, id) {
  const check = canLearn(player, id);
  if (!check.ok) return check;
  if (!player.learnedTechniques) player.learnedTechniques = [];
  player.learnedTechniques.push(id);
  player.skillPoints -= TECHNIQUES[id].cost;
  return { ok: true };
}

// canCast/cast take an optional costMultiplier (default 1 — no behavior change
// for existing callers) so the caller (game.js) can apply the Dao Heart "Ascetic"
// Qi discount from Economy's shop without techniques.js importing meritshop.js
// (doc 30 §3.4).
export function canCast(player, qi, id, costMultiplier = 1) {
  const t = TECHNIQUES[id];
  if (!t) return { ok: false };
  if (!isLearned(player, id)) return { ok: false, reason: 'Not learned.' };
  const cost = Math.max(1, Math.round(t.qiCost * costMultiplier));
  if (qi < cost) return { ok: false, reason: `Need ${cost} Qi.` };
  return { ok: true, cost };
}

// Cast (or refresh) an ability buff. Caller deducts res.cost from Qi.
// Refresh-not-stack: casting an already-active ability resets its clock to the
// full duration; it never stacks or extends past one duration's worth.
export function cast(player, qi, id, now = Date.now(), costMultiplier = 1) {
  const check = canCast(player, qi, id, costMultiplier);
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
  return { ok: true, cost: check.cost, duration: t.duration };
}

// --- Respec hooks the premium shop needs (doc 30 §3.4; unconditional). ---

// Total skill points invested in active abilities — the cost basis for the
// shop's Technique Respec row. skillPoints is a stored counter, so this
// refunds directly.
export function techniquePointsSpent(player) {
  return (player.learnedTechniques ?? []).reduce((sum, id) => sum + (TECHNIQUES[id]?.cost ?? 0), 0);
}

// Unlearn every ability, refund the points, and drop any active buffs (a
// dropped ability can't stay active).
export function resetTechniques(player) {
  const refunded = techniquePointsSpent(player);
  player.skillPoints = (player.skillPoints ?? 0) + refunded;
  player.learnedTechniques = [];
  player.activeBuffs = [];
  return { ok: true, refunded };
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
