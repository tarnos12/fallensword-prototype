// Achievements / milestones (GDD §6.5 flavour — long-tail goals). A read-only
// layer over the existing save: every milestone is a predicate evaluated on
// demand against player state (level/realm, bestiary kills, Spirit Cards, owned
// gear rarity, sect members, spirit stones, techniques). Nothing here owns new
// persistent game data beyond the unlocked-id list on `player.achievements` —
// that list is purely a "have we toasted this yet" ledger, so the achievements
// themselves can be re-tuned freely without a migration.
//
// Kept a leaf module: it imports the catalogs it measures against (creatures,
// cards, rarities) but nothing imports it except the game/UI layers, so there's
// no cycle. The DOM (button, modal, toasts) is self-contained here, matching how
// the other feature modules own their own surface.

import { CREATURE_TYPES } from './actors.js';
import { CARDS, ownedCardCount } from './cards.js';
import { REALMS } from './progression.js';
import { setBonuses } from './sets.js';

const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
const TOTAL_CREATURES = Object.keys(CREATURE_TYPES).length;
const TOTAL_CARDS = Object.keys(CARDS).length;
// Global stage index at which the second realm (Foundation Establishment) begins.
const FOUNDATION_STAGE = REALMS[0].stages + 1;
// ...and the third realm (Core Formation) — derived from the realm ladder so it
// tracks any future re-tune of the earlier realms' stage counts.
const CORE_FORMATION_STAGE = REALMS[0].stages + (REALMS[1]?.stages ?? 0) + 1;

// --- Derived measurements (all read-only over the save) ---

function totalKills(player) {
  return Object.values(player.bestiary ?? {}).reduce((s, e) => s + (e.kills || 0), 0);
}

function creaturesSeen(player) {
  return Object.keys(player.bestiary ?? {}).length;
}

function ownedItems(player) {
  const equipped = Object.values(player.equipment ?? {}).filter(Boolean);
  return [...(player.inventory ?? []), ...equipped];
}

function bestRarityIndex(player) {
  let best = -1;
  for (const it of ownedItems(player)) {
    const idx = RARITY_ORDER.indexOf(it.rarity);
    if (idx > best) best = idx;
  }
  return best;
}

function hasMaxedCard(player) {
  const cards = player.cards ?? {};
  return Object.entries(cards).some(([id, lv]) => CARDS[id] && lv >= CARDS[id].maxLevel);
}

// A gem is slotted into a socket of an equipped artifact (sockets.js fills an
// item.sockets[] slot with a gem object; empty sockets are null/undefined).
function hasFilledSocket(player) {
  for (const item of Object.values(player.equipment ?? {})) {
    if (item && Array.isArray(item.sockets) && item.sockets.some(Boolean)) return true;
  }
  return false;
}

// A full gear set is equipped (setBonuses returns all-zero stats otherwise).
function hasCompleteSet(player) {
  return Object.values(setBonuses(player)).some((v) => v > 0);
}

// Highest rank across the player's opened meridians (0 if none opened).
function bestMeridianRank(player) {
  const nodes = player.meridians?.nodes ?? {};
  let best = 0;
  for (const rank of Object.values(nodes)) if (rank > best) best = rank;
  return best;
}

// --- Milestone catalog. Ordered as displayed; `check(player)` is the predicate. ---
// tier is cosmetic (colour band); hint shows while locked.
export const ACHIEVEMENTS = [
  { id: 'first_blood', icon: '🗡', name: 'First Blood', tier: 'bronze',
    desc: 'Slay your first demonic beast.', check: (p) => totalKills(p) >= 1 },
  { id: 'hunter', icon: '🏹', name: 'Seasoned Hunter', tier: 'bronze',
    desc: 'Slay 50 beasts.', check: (p) => totalKills(p) >= 50 },
  { id: 'slayer', icon: '⚔️', name: 'Beast Slayer', tier: 'silver',
    desc: 'Slay 250 beasts.', check: (p) => totalKills(p) >= 250 },
  { id: 'first_breakthrough', icon: '☯️', name: 'First Breakthrough', tier: 'bronze',
    desc: 'Break through to the second stage of cultivation.', check: (p) => p.level >= 2 },
  { id: 'foundation', icon: '🏔', name: 'Foundation Established', tier: 'gold',
    desc: 'Pierce the realm barrier into Foundation Establishment.', check: (p) => p.level >= FOUNDATION_STAGE },
  { id: 'technician', icon: '🌀', name: 'Inner Comprehension', tier: 'bronze',
    desc: 'Comprehend your first technique.', check: (p) => (p.learnedTechniques ?? []).length >= 1 },
  { id: 'first_epic', icon: '💎', name: 'Treasured Artifact', tier: 'silver',
    desc: 'Own an Epic or finer artifact.', check: (p) => bestRarityIndex(p) >= RARITY_ORDER.indexOf('epic') },
  { id: 'legendary_bearer', icon: '🌟', name: 'Legend in Hand', tier: 'gold',
    desc: 'Own a Legendary or finer artifact.', check: (p) => bestRarityIndex(p) >= RARITY_ORDER.indexOf('legendary') },
  { id: 'wealthy', icon: '💰', name: 'Spirit-Stone Magnate', tier: 'silver',
    desc: 'Hold 1,000 spirit stones at once.', check: (p) => (p.spiritStones ?? 0) >= 1000 },
  { id: 'first_disciple', icon: '⛩', name: 'Sect Founder', tier: 'bronze',
    desc: 'Recruit your first sect disciple.', check: (p) => (p.guild?.members ?? []).length >= 1 },
  { id: 'card_collector', icon: '🃏', name: 'Spirit Cardist', tier: 'silver',
    desc: 'Collect one of every Spirit Card.', check: (p) => ownedCardCount(p) >= TOTAL_CARDS },
  { id: 'card_master', icon: '✨', name: 'Card Refined', tier: 'gold',
    desc: 'Refine any Spirit Card to its maximum level.', check: hasMaxedCard },
  { id: 'codex_scholar', icon: '📖', name: 'Codex Scholar', tier: 'gold',
    desc: 'Encounter every creature in the bestiary.', check: (p) => creaturesSeen(p) >= TOTAL_CREATURES },
  // --- Stage 3 milestones (crafting/sockets/sets/alchemy/meridians/realms/ascension) ---
  { id: 'core_formation', icon: '🟡', name: 'Golden Core', tier: 'gold',
    desc: 'Condense your golden core — reach Core Formation.', check: (p) => p.level >= CORE_FORMATION_STAGE },
  { id: 'meridian_open', icon: '☯', name: 'Meridians Opened', tier: 'bronze',
    desc: 'Open your first extraordinary meridian.', check: (p) => bestMeridianRank(p) >= 1 },
  { id: 'meridian_master', icon: '🌌', name: 'Meridian Perfected', tier: 'gold',
    desc: 'Refine a single meridian to its highest rank.', check: (p) => bestMeridianRank(p) >= 5 },
  { id: 'gem_socketed', icon: '💠', name: 'Jeweled Artifact', tier: 'silver',
    desc: 'Slot a spirit gem into an equipped artifact.', check: hasFilledSocket },
  { id: 'set_complete', icon: '🎽', name: 'Matched Regalia', tier: 'gold',
    desc: 'Wear a complete matched gear set.', check: hasCompleteSet },
  { id: 'alchemist', icon: '🜁', name: 'Pill Refiner', tier: 'bronze',
    desc: 'Brew your first alchemical pill.', check: (p) => Object.values(p.consumables ?? {}).some((q) => (q ?? 0) > 0) },
  { id: 'full_sect', icon: '🏯', name: 'Grand Sect Master', tier: 'silver',
    desc: 'Command a full sect of three disciples.', check: (p) => (p.guild?.members ?? []).length >= 3 },
  { id: 'treasury', icon: '🏆', name: 'Immortal Treasury', tier: 'gold',
    desc: 'Hold 10,000 spirit stones at once.', check: (p) => (p.spiritStones ?? 0) >= 10000 },
  { id: 'ascended', icon: '✦', name: 'Reforged Foundation', tier: 'gold',
    desc: 'Shatter your foundation and ascend anew.', check: (p) => (p.ascension ?? 0) >= 1 },
  { id: 'thrice_reborn', icon: '✨', name: 'Thrice-Reborn', tier: 'gold',
    desc: 'Ascend through three cycles of rebirth.', check: (p) => (p.ascension ?? 0) >= 3 },
];

const BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

// Which achievement ids are currently satisfied by the given player.
export function unlockedIds(player) {
  return ACHIEVEMENTS.filter((a) => {
    try { return a.check(player); } catch { return false; }
  }).map((a) => a.id);
}

// Idempotent "check & record": diff the satisfied set against the persisted
// ledger, append any newly-satisfied ids, and return the newly-unlocked
// achievement objects (for a toast). Mutates player.achievements in place; the
// caller (game.js) persists. Pure w.r.t. everything else.
export function recordAchievements(state) {
  const p = state.player;
  if (!Array.isArray(p.achievements)) p.achievements = [];
  const have = new Set(p.achievements);
  const fresh = [];
  for (const id of unlockedIds(p)) {
    if (!have.has(id)) {
      have.add(id);
      p.achievements.push(id);
      fresh.push(BY_ID[id]);
    }
  }
  return fresh;
}

export function achievementProgress(player) {
  const have = new Set(player.achievements ?? []);
  return { earned: have.size, total: ACHIEVEMENTS.length };
}

// =====================================================================
// UI — self-contained modal + toast (no dependency on ui.js).
// =====================================================================

let bound = false;

export function initAchievements(state) {
  if (!bound) {
    bound = true;
    const overlay = document.getElementById('achievements-overlay');
    document.getElementById('btn-achievements').addEventListener('click', () => {
      renderAchievementsPanel(state);
      overlay.classList.remove('hidden');
    });
    document.getElementById('btn-close-achievements').addEventListener('click', () => {
      overlay.classList.add('hidden');
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.add('hidden');
    });
  }
  updateAchievementBadge(state);
}

// Reflect earned/total on the button (so the panel advertises progress).
export function updateAchievementBadge(state) {
  const el = document.getElementById('achievements-badge');
  if (!el) return;
  const { earned, total } = achievementProgress(state.player);
  el.textContent = `${earned}/${total}`;
}

function renderAchievementsPanel(state) {
  const p = state.player;
  const have = new Set(p.achievements ?? []);
  const live = new Set(unlockedIds(p)); // in case something is satisfied but not yet recorded
  const body = document.getElementById('achievements-body');
  const { earned, total } = achievementProgress(p);
  document.getElementById('achievements-count').textContent = `${earned}/${total}`;

  body.innerHTML = '';
  for (const a of ACHIEVEMENTS) {
    const done = have.has(a.id) || live.has(a.id);
    const row = document.createElement('div');
    row.className = `ach-row ${done ? 'ach-done ach-' + a.tier : 'ach-locked'}`;
    const icon = document.createElement('div');
    icon.className = 'ach-icon';
    icon.textContent = done ? a.icon : '🔒';
    const text = document.createElement('div');
    text.className = 'ach-text';
    const name = document.createElement('div');
    name.className = 'ach-name';
    name.textContent = a.name;
    const desc = document.createElement('div');
    desc.className = 'ach-desc';
    desc.textContent = a.desc;
    text.append(name, desc);
    row.append(icon, text);
    if (done) {
      const check = document.createElement('div');
      check.className = 'ach-check';
      check.textContent = '✓';
      row.append(check);
    }
    body.append(row);
  }
}

// Show a transient unlock toast for each newly-earned achievement.
export function showAchievementToasts(list) {
  if (!list || !list.length) return;
  let host = document.getElementById('achievement-toasts');
  if (!host) {
    host = document.createElement('div');
    host.id = 'achievement-toasts';
    document.body.append(host);
  }
  for (const a of list) {
    const t = document.createElement('div');
    t.className = `ach-toast ach-${a.tier}`;
    t.innerHTML =
      `<span class="ach-toast-icon">${a.icon}</span>` +
      `<span class="ach-toast-body"><strong>Achievement unlocked</strong><br>${a.name}</span>`;
    host.append(t);
    // Fade in, then out, then remove — CSS-driven; timings are cosmetic.
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => {
      t.classList.remove('show');
      setTimeout(() => t.remove(), 400);
    }, 4200);
  }
}
