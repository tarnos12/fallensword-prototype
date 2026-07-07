// Cultivator Titles — a read-only cosmetic (GDD §6.5 flavour). Every honorific is
// DERIVED from progress the save already tracks (cultivation stage, kills, boss
// defeats, collections, achievements, ascension); nothing here is persisted and
// the player is never mutated. The player's "active" title is simply the most
// prestigious one they currently qualify for.
//
// Self-contained like stats.js / crafting.js: owns its own 🏵 button (injected
// into #nav-menu), its own modal DOM, and its own stylesheet. Never touches
// ui.js, game.js or the save schema.

import { MAX_STAGE, REALMS } from './progression.js';
import { CREATURE_TYPES } from './actors.js';
import { CARDS, ownedCardCount } from './cards.js';
import { achievementProgress } from './achievements.js';

const TOTAL_CREATURES = Object.keys(CREATURE_TYPES).length;
const TOTAL_CARDS = Object.keys(CARDS).length;
// Derived stage thresholds so the ladder tracks the realm ladder as data, not
// hard-coded numbers (QC=1..9, FE begins at 10, CF begins at 19 given 9/realm).
const FOUNDATION_STAGE = REALMS[0].stages + 1; // first stage of realm #2
const CORE_STAGE = REALMS[0].stages + REALMS[1].stages + 1; // first stage of realm #3

// --- Read-only derivations over the player ---

function totalKills(p) {
  return Object.values(p.bestiary ?? {}).reduce((s, e) => s + (e.kills || 0), 0);
}
function creaturesSeen(p) {
  return Object.keys(p.bestiary ?? {}).length;
}
function bossDefeats(p) {
  const boss = p.boss ?? {};
  // player.boss is keyed by boss id → { defeats, ... } (see boss.js). Guard the
  // legacy flat shape ({ defeats }) too, just in case load-time migration hasn't
  // run yet.
  if (typeof boss.defeats === 'number') return boss.defeats;
  return Object.values(boss).reduce((s, r) => s + (r?.defeats || 0), 0);
}
function achievementsEarned(p) {
  return achievementProgress(p).earned;
}

// --- The ladder (data) — ordered LEAST → MOST prestigious. activeTitle() picks
// the highest-index earned title. Each `test(player)` reads only existing state.
export const TITLES = [
  {
    id: 'ashen_wanderer',
    name: 'Ashen Wanderer',
    flavor: 'A mortal who first drew breath of Qi and stepped onto the endless road.',
    hint: 'Begin your cultivation.',
    test: () => true,
  },
  {
    id: 'blooded',
    name: 'Blooded Hunter',
    flavor: 'The first demonic beast has fallen to your hand — the road remembers its dead.',
    hint: 'Slay your first demonic beast.',
    test: (p) => totalKills(p) >= 1,
  },
  {
    id: 'qi_adept',
    name: 'Qi-Gathering Adept',
    flavor: 'Your meridians run clear; the gathered Qi no longer scatters at a breath.',
    hint: 'Reach Qi Condensation 5.',
    test: (p) => p.level >= 5,
  },
  {
    id: 'seasoned_slayer',
    name: 'Seasoned Slayer',
    flavor: 'A hundred beasts and more lie behind you. The wilds speak your name in fear.',
    hint: 'Slay 100 demonic beasts.',
    test: (p) => totalKills(p) >= 100,
  },
  {
    id: 'foundation_forged',
    name: 'Foundation-Forged',
    flavor: 'You pierced the first great barrier — a true cultivator, foundation set in jade.',
    hint: 'Break through into Foundation Establishment.',
    test: (p) => p.level >= FOUNDATION_STAGE,
  },
  {
    id: 'inner_sage',
    name: 'Inner Sage',
    flavor: 'Three secret arts comprehended and woven into flesh and will.',
    hint: 'Comprehend 3 techniques.',
    test: (p) => (p.learnedTechniques ?? []).length >= 3,
  },
  {
    id: 'calamity_breaker',
    name: 'Calamity-Breaker',
    flavor: 'You stood before a legendary calamity beast — and it, not you, was undone.',
    hint: 'Fell a Legendary calamity boss.',
    test: (p) => bossDefeats(p) >= 1,
  },
  {
    id: 'core_sovereign',
    name: 'Core-Formed Sovereign',
    flavor: 'A golden core turns within your dantian; lesser cultivators bow unbidden.',
    hint: 'Break through into Core Formation.',
    test: (p) => p.level >= CORE_STAGE,
  },
  {
    id: 'codex_master',
    name: 'Codex Master',
    flavor: 'Every beast of these lands is catalogued in your Beast Codex, root and fang.',
    hint: 'Encounter every creature in the Beast Codex.',
    test: (p) => creaturesSeen(p) >= TOTAL_CREATURES,
  },
  {
    id: 'card_sovereign',
    name: 'Spirit Card Sovereign',
    flavor: 'The full pantheon of Spirit Cards answers to you — a menagerie of bound souls.',
    hint: 'Collect one of every Spirit Card.',
    test: (p) => ownedCardCount(p) >= TOTAL_CARDS,
  },
  {
    id: 'illustrious',
    name: 'Illustrious Immortal',
    flavor: 'Your deeds are legion; the heavens themselves keep a ledger of your name.',
    hint: 'Unlock 10 achievements.',
    test: (p) => achievementsEarned(p) >= 10,
  },
  {
    id: 'peak',
    name: 'Peak of Cultivation',
    flavor: 'You stand at the very summit of the mortal realms, nothing left above but the void.',
    hint: 'Reach the peak of cultivation.',
    test: (p) => p.level >= MAX_STAGE,
  },
  {
    id: 'nine_heavens',
    name: 'Nine-Heavens Ascendant',
    flavor: 'You shattered your foundation to be reborn stronger — the cycle bends to your will.',
    hint: 'Ascend at least once (New Game+).',
    test: (p) => (p.ascension ?? 0) >= 1,
  },
];

// Every title the player currently qualifies for, ladder order preserved.
export function earnedTitles(player) {
  return TITLES.filter((t) => {
    try { return t.test(player); } catch { return false; }
  });
}

// The single most prestigious earned title (highest ladder index). Always at
// least the entry title, since its test is unconditional.
export function activeTitle(player) {
  const earned = earnedTitles(player);
  return earned.length ? earned[earned.length - 1] : TITLES[0];
}

// =====================================================================
// UI — own 🏵 button + modal (no ui.js).
// =====================================================================

let bound = false;

export function initTitles(state) {
  if (bound) return;
  bound = true;

  const nav = document.getElementById('nav-menu');
  if (nav && !document.getElementById('btn-titles')) {
    const btn = document.createElement('button');
    btn.id = 'btn-titles';
    btn.type = 'button';
    btn.className = 'titles-btn';
    btn.title = 'Cultivator Titles — honorifics earned along your path';
    btn.textContent = '🏵 Titles';
    btn.addEventListener('click', () => openTitles(state));
    nav.appendChild(btn);
  }
  buildModal();
}

function buildModal() {
  if (document.getElementById('titles-overlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'titles-overlay';
  overlay.className = 'hidden';
  overlay.innerHTML = `
    <div id="titles-panel">
      <div id="titles-header">
        <h2>Cultivator Titles</h2>
        <button id="btn-close-titles" type="button" title="Close">✕</button>
      </div>
      <div id="titles-active"></div>
      <div id="titles-body"></div>
    </div>`;
  document.body.append(overlay);
  document.getElementById('btn-close-titles').addEventListener('click', closeTitles);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeTitles(); });
}

function openTitles(state) {
  renderTitles(state);
  document.getElementById('titles-overlay').classList.remove('hidden');
}

function closeTitles() {
  document.getElementById('titles-overlay').classList.add('hidden');
}

export function renderTitles(state) {
  const p = state.player;
  const earnedSet = new Set(earnedTitles(p).map((t) => t.id));
  const active = activeTitle(p);

  // Active-title banner.
  const banner = document.getElementById('titles-active');
  if (banner) {
    banner.innerHTML = `
      <div class="titles-active-label">Your current title</div>
      <div class="titles-active-name">${active.name}</div>
      <div class="titles-active-flavor">${active.flavor}</div>
      <div class="titles-active-count">${earnedSet.size} / ${TITLES.length} honorifics earned</div>`;
  }

  // Full ladder — most prestigious first so the goal reads top-down.
  const body = document.getElementById('titles-body');
  if (!body) return;
  body.innerHTML = '';
  for (let i = TITLES.length - 1; i >= 0; i--) {
    const t = TITLES[i];
    const unlocked = earnedSet.has(t.id);
    const isActive = t.id === active.id;

    const row = document.createElement('div');
    row.className = `title-row ${unlocked ? 'unlocked' : 'locked'}${isActive ? ' active' : ''}`;

    const mark = document.createElement('span');
    mark.className = 'title-mark';
    mark.textContent = unlocked ? '🏵' : '🔒';

    const info = document.createElement('div');
    info.className = 'title-info';
    const name = document.createElement('div');
    name.className = 'title-name';
    name.textContent = t.name + (isActive ? '  ·  active' : '');
    const detail = document.createElement('div');
    detail.className = 'title-detail';
    // Show the flavour once earned; a plain how-to hint while locked.
    detail.textContent = unlocked ? t.flavor : t.hint;
    info.append(name, detail);

    row.append(mark, info);
    body.append(row);
  }
}
