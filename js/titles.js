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
import { setBonuses } from './sets.js';
import { MERIDIAN_NODES } from './meridians.js';
import { toast } from './toast.js'; // one-directional (toast.js does NOT import titles.js — no cycle)

// Display-preference storage for the player-chosen active title. This is a pure
// cosmetic choice (mirrors theme.js / audio.js), NOT part of the save schema —
// it lives in its own localStorage key so it survives export/import/reset and
// never needs a VERSION bump. localStorage can throw (private mode / quota), so
// every access is guarded.
const TITLE_PREF_KEY = 'fallen-immortal-title';

export function getPreferredTitleId() {
  try { return localStorage.getItem(TITLE_PREF_KEY) || null; } catch { return null; }
}
export function setPreferredTitleId(id) {
  try {
    if (id) localStorage.setItem(TITLE_PREF_KEY, id);
    else localStorage.removeItem(TITLE_PREF_KEY);
  } catch { /* storage unavailable — the pick just won't persist */ }
}

// Notification ledger for "which earned titles has this browser already been
// toasted about". Like TITLE_PREF_KEY, this is a display/notification pref in its
// OWN localStorage key — NOT the save schema (survives export/import/reset, no
// VERSION bump). Every access is guarded: storage can throw / be absent / hold
// garbage, and NONE of those must ever produce a spam of toasts.
const TITLES_SEEN_KEY = 'fallen-immortal-titles-seen';

// Returns the array of already-notified title ids, or null when the ledger is
// absent/unreadable/corrupt — the null case means "seed silently, toast nothing"
// so a bad value can never trigger a flood.
function readSeenTitles() {
  try {
    const raw = localStorage.getItem(TITLES_SEEN_KEY);
    if (raw == null) return null;              // first run — seed silently
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return null;      // garbage — reseed silently
    return arr;
  } catch {
    return null;                               // storage/parse failure — reseed silently
  }
}
function writeSeenTitles(ids) {
  try { localStorage.setItem(TITLES_SEEN_KEY, JSON.stringify(ids)); }
  catch { /* storage unavailable — notifications just won't persist */ }
}

// Cheap fingerprint of the last-seen earned set so the 1.5s poll early-returns
// instantly when nothing changed (the overwhelmingly common case).
let lastEarnedKey = null;

// Idempotent, called on the same 1.5s cadence as the chip. On the FIRST run for a
// browser (ledger absent) it seeds the ledger with every currently-earned title
// and toasts NOTHING — an existing player with N earned titles must not get N
// toasts. Afterwards, only titles that become earned AFTER the seed toast, and a
// burst is capped to a single (highest-prestige) toast so it can never flood.
export function checkNewTitles(state) {
  try {
    const player = state && state.player;
    if (!player) return;

    const earnedIds = earnedTitles(player).map((t) => t.id);
    const key = earnedIds.join('|');
    if (key === lastEarnedKey) return; // nothing changed since last poll — bail fast
    lastEarnedKey = key;

    const seen = readSeenTitles();
    if (seen === null) {
      // First run (or unreadable ledger): seed silently, no toasts.
      writeSeenTitles(earnedIds);
      return;
    }

    const seenSet = new Set(seen);
    const newly = earnedIds.filter((id) => !seenSet.has(id));
    if (newly.length === 0) return;

    // TITLES is ordered least → most prestigious. Toast only the single highest
    // newly-earned title; if several arrived at once, note the remainder rather
    // than firing a toast per title.
    const rank = new Map(TITLES.map((t, i) => [t.id, i]));
    newly.sort((a, b) => (rank.get(a) ?? 0) - (rank.get(b) ?? 0));
    const topId = newly[newly.length - 1];
    const topTitle = TITLES.find((t) => t.id === topId);
    if (topTitle) {
      const extra = newly.length - 1;
      const suffix = extra > 0 ? ` (…and ${extra} more)` : '';
      toast(`🏵 New title earned: “${topTitle.name}”${suffix}`, 'success');
    }

    writeSeenTitles([...seenSet, ...newly]);
  } catch {
    /* a bad ledger value must never break the chip or the game */
  }
}

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
// A full gear set is worn when setBonuses returns any non-zero stat (a matched
// weapon+robe pair equipped). Pure read of player.equipment via sets.js.
function fullSetWorn(p) {
  const b = setBonuses(p);
  return Object.values(b).some((v) => v > 0);
}
// A meridian is fully opened when any node's rank has reached its maxRank (5).
// Pure read of player.meridians.nodes; tolerant of old saves that lack the field.
function hasMaxedMeridian(p) {
  const nodes = p.meridians?.nodes ?? {};
  return Object.entries(nodes).some(
    ([id, rank]) => (rank || 0) >= (MERIDIAN_NODES[id]?.maxRank ?? Infinity),
  );
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
    id: 'meridian_paragon',
    name: 'Meridian Paragon',
    flavor: 'One of your eight extraordinary channels runs open to its very floor — power flows unhindered.',
    hint: 'Open a meridian channel to its highest rank.',
    test: (p) => hasMaxedMeridian(p),
  },
  {
    id: 'regalia_bearer',
    name: 'Regalia-Bearer',
    flavor: 'A matched set of heaven-forged artifacts girds you head to heel, resonating as one.',
    hint: 'Equip a complete gear set at once.',
    test: (p) => fullSetWorn(p),
  },
  {
    id: 'illustrious',
    name: 'Illustrious Immortal',
    flavor: 'Your deeds are legion; the heavens themselves keep a ledger of your name.',
    hint: 'Unlock 10 achievements.',
    test: (p) => achievementsEarned(p) >= 10,
  },
  {
    id: 'grand_luminary',
    name: 'Grand Luminary',
    flavor: 'A score of legendary deeds are carved into the annals — few names shine so bright.',
    hint: 'Unlock 20 achievements.',
    test: (p) => achievementsEarned(p) >= 20,
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
  {
    id: 'thrice_reborn',
    name: 'Thrice-Reborn Exalt',
    flavor: 'Three times you burned your foundation to ash and rose anew — mortality is a habit you have broken.',
    hint: 'Ascend three times (New Game+).',
    test: (p) => (p.ascension ?? 0) >= 3,
  },
  {
    id: 'eternal_sovereign',
    name: 'Eternal Sovereign',
    flavor: 'Five cycles of ruin and rebirth lie behind you; the wheel of ascension turns only at your word.',
    hint: 'Ascend five times (New Game+).',
    test: (p) => (p.ascension ?? 0) >= 5,
  },
];

// Every title the player currently qualifies for, ladder order preserved.
export function earnedTitles(player) {
  return TITLES.filter((t) => {
    try { return t.test(player); } catch { return false; }
  });
}

// The player's displayed title. If they've picked a preferred title AND still
// qualify for it, honour that pick; otherwise fall back to the single most
// prestigious earned title (highest ladder index). Always returns a valid title
// (at least the entry title, whose test is unconditional) so the chip and any
// external caller never see undefined. A stale/garbage preferred id (an unearned
// or removed title) is simply ignored — same signature, same guarantees.
export function activeTitle(player) {
  const earned = earnedTitles(player);
  const highest = earned.length ? earned[earned.length - 1] : TITLES[0];
  const prefId = getPreferredTitleId();
  if (prefId) {
    const picked = earned.find((t) => t.id === prefId);
    if (picked) return picked;
  }
  return highest;
}

// =====================================================================
// UI — own 🏵 button + modal (no ui.js).
// =====================================================================

let bound = false;

export function initTitles(state) {
  if (bound) return;
  bound = true;

  const nav = document.getElementById('records-menu'); // IA restructure (Wave 1): Cultivator → Records
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
  injectChip(state);
}

// --- Always-visible HUD chip showing the active title (pure derived display).
// Self-injects into the top player bar; clicking opens the Titles modal. A cheap
// interval keeps it in sync with progression without any main.js/ui.js wiring.
let lastChipName = null;

function injectChip(state) {
  if (document.getElementById('title-chip')) return;
  // Natural home is the top HUD; fall back to just before the nav menu.
  const host = document.getElementById('player-bar') || null;
  const chip = document.createElement('div');
  chip.id = 'title-chip';
  chip.setAttribute('role', 'button');
  chip.setAttribute('tabindex', '0');
  chip.title = 'Your current cultivator title — click for the full ladder';

  const icon = document.createElement('span');
  icon.className = 'title-chip-icon';
  icon.textContent = '🏵';
  const name = document.createElement('span');
  name.className = 'title-chip-name';
  chip.append(icon, name);

  const open = () => openTitles(state);
  chip.addEventListener('click', open);
  chip.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
  });

  if (host) host.append(chip);
  else {
    const nav = document.getElementById('nav-menu');
    if (nav && nav.parentNode) nav.parentNode.insertBefore(chip, nav);
    else document.body.append(chip);
  }

  updateTitleChip(state);
  checkNewTitles(state); // seeds the notification ledger silently on first run
  // Self-updating: refresh cheaply so the chip tracks progression live without
  // any external render hook. Same cadence drives the new-title notifier.
  setInterval(() => {
    updateTitleChip(state);
    checkNewTitles(state);
  }, 1500);
}

export function updateTitleChip(state) {
  const chip = document.getElementById('title-chip');
  if (!chip) return;
  const player = state && state.player;
  if (!player) { chip.classList.add('hidden'); return; }
  const active = activeTitle(player);
  if (!active) { chip.classList.add('hidden'); return; }
  chip.classList.remove('hidden');
  if (active.name === lastChipName) return;
  lastChipName = active.name;
  const name = chip.querySelector('.title-chip-name');
  if (name) name.textContent = active.name; // static catalog data; textContent for safety
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

  const prefId = getPreferredTitleId();
  const autoMode = !prefId || !earnedSet.has(prefId);

  // Active-title banner + the "display mode" control (Auto vs a chosen title).
  const banner = document.getElementById('titles-active');
  if (banner) {
    banner.innerHTML = `
      <div class="titles-active-label">Your current title</div>
      <div class="titles-active-name">${active.name}</div>
      <div class="titles-active-flavor">${active.flavor}</div>
      <div class="titles-active-count" title="Cosmetic only — titles have no gameplay effect, they're a record of what you've accomplished.">${earnedSet.size} / ${TITLES.length} honorifics earned</div>`;
    const auto = document.createElement('button');
    auto.type = 'button';
    auto.className = `titles-auto-btn${autoMode ? ' on' : ''}`;
    auto.textContent = autoMode ? '✓ Auto (highest earned)' : 'Use Auto (highest earned)';
    auto.title = 'Always display your most prestigious earned title';
    auto.addEventListener('click', () => {
      setPreferredTitleId(null);
      renderTitles(state);
      updateTitleChip(state);
    });
    banner.append(auto);
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
    row.title = unlocked ? `${t.name} — ${t.flavor}` : `Locked — ${t.hint}`;

    const mark = document.createElement('span');
    mark.className = 'title-mark';
    mark.textContent = unlocked ? '🏵' : '🔒';
    mark.title = unlocked ? 'Earned' : 'Not yet earned';

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

    // Earned titles are pickable; locked ones are not. The active row shows a
    // marker instead of a button.
    if (unlocked) {
      const pick = document.createElement('button');
      pick.type = 'button';
      pick.className = `title-pick${isActive ? ' active' : ''}`;
      pick.textContent = isActive ? '● Active' : 'Display';
      pick.title = isActive ? 'This title is currently displayed' : `Display “${t.name}” as your title`;
      if (!isActive) {
        pick.addEventListener('click', () => {
          setPreferredTitleId(t.id);
          renderTitles(state);
          updateTitleChip(state);
        });
      }
      row.append(pick);
    }

    body.append(row);
  }
}
