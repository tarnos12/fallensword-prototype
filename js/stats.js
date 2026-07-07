// Statistics / lifetime summary (Stage 3, task S3). A read-only 📊 "Chronicle of
// Deeds" modal. Most figures are DERIVED live from existing save data (bestiary
// kill totals, codex/card completion, spirit stones on hand, cultivation stage);
// only the few things that can't be derived — fights won/lost/drawn, spirit
// stones won in battle, artifacts looted, time played — are genuine lifetime
// counters kept on `player.stats` and incremented at the combat hooks in game.js.
//
// Self-contained like crafting.js / meridians.js: owns its own 📊 button (injected
// into #nav-menu), its own modal DOM, and its own stylesheet. Never touches ui.js
// and never mutates game state.

import { stageName, realmFor, MAX_STAGE, ASCENSION_STAT_PER_TIER } from './progression.js';
import { CREATURE_TYPES } from './actors.js';
import { CARDS, ownedCardCount } from './cards.js';
import { achievementProgress } from './achievements.js';
import { setBonuses } from './sets.js';
import { MERIDIAN_LIST } from './meridians.js';

const TOTAL_CREATURES = Object.keys(CREATURE_TYPES).length;
const TOTAL_CARDS = Object.keys(CARDS).length;

// --- Derivations (read-only over the player) ---

function totalKills(p) {
  return Object.values(p.bestiary ?? {}).reduce((s, e) => s + (e.kills || 0), 0);
}
function speciesFaced(p) {
  return Object.keys(p.bestiary ?? {}).length;
}
function pct(n, d) {
  return d > 0 ? Math.round((n / d) * 100) : 0;
}

// --- Stage-3 system derivations (all pure reads over confirmed fields) ---

// Ascension tier — prestige count on player.ascension (ascension.js writes it).
function ascensionTier(p) {
  return p.ascension ?? 0;
}
// Meridian nodes opened (rank >= 1) — player.meridians.nodes[id] = rank (meridians.js).
function meridiansOpened(p) {
  return Object.values(p.meridians?.nodes ?? {}).filter((r) => (r || 0) >= 1).length;
}
// Total meridian ranks spent across all nodes.
function meridianRankTotal(p) {
  return Object.values(p.meridians?.nodes ?? {}).reduce((a, b) => a + (b || 0), 0);
}
// Gems slotted into equipped gear — item.sockets[] holds gem objects (sockets.js).
function gemsSocketed(p) {
  let n = 0;
  for (const item of Object.values(p.equipment ?? {})) {
    if (item && Array.isArray(item.sockets)) n += item.sockets.filter(Boolean).length;
  }
  return n;
}
// Whether a full gear set is worn — setBonuses() returns all-zero when none (sets.js).
function setActive(p) {
  return Object.values(setBonuses(p)).some((v) => v > 0);
}
// Alchemy pills held — player.consumables = { pillId: qty } (alchemy.js / game.js).
function pillsHeld(p) {
  return Object.values(p.consumables ?? {}).reduce((a, b) => a + (b || 0), 0);
}
// Active hunt bounties — player.bounties is a bare array (bounties.js).
function activeBounties(p) {
  return Array.isArray(p.bounties) ? p.bounties.length : 0;
}
// Sect disciples afield — player.sectMissions.active[] (sectmissions.js).
function activeSectMissions(p) {
  return (p.sectMissions?.active ?? []).length;
}

function formatDuration(ms) {
  if (!ms || ms < 1000) return '—';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

// Build the full set of display rows, grouped into sections.
export function statsSummary(state) {
  const p = state.player;
  const st = p.stats ?? {};
  const won = st.fightsWon || 0;
  const lost = st.fightsLost || 0;
  const drawn = st.fightsDrawn || 0;
  const resolved = won + lost;
  const { realm, sub } = realmFor(p.level);
  const ach = achievementProgress(p);
  const asc = ascensionTier(p);

  return [
    {
      title: 'Cultivation',
      rows: [
        ['Realm', `${realm} ${sub}`],
        ['Stage', `${p.level} / ${MAX_STAGE}${p.level >= MAX_STAGE ? ' (peak)' : ''}`],
        ['Current XP', `${p.xp}`],
        ['Unspent stat points', `${p.statPoints || 0}`],
        ['Techniques learned', `${(p.learnedTechniques ?? []).length}`],
      ],
    },
    {
      title: 'Battle',
      rows: [
        ['Beasts slain', `${totalKills(p)}`],
        ['Species faced', `${speciesFaced(p)} / ${TOTAL_CREATURES}`],
        ['Fights won', `${won}`],
        ['Fights lost', `${lost}`],
        ['Draws (unresolved)', `${drawn}`],
        ['Win rate', resolved > 0 ? `${pct(won, resolved)}%` : '—'],
        ['Artifacts looted', `${st.itemsLooted || 0}`],
        ['Active hunt bounties', `${activeBounties(p)}`],
      ],
    },
    {
      title: 'Collection',
      rows: [
        ['Beast Codex', `${speciesFaced(p)} / ${TOTAL_CREATURES} (${pct(speciesFaced(p), TOTAL_CREATURES)}%)`],
        ['Spirit Cards', `${ownedCardCount(p)} / ${TOTAL_CARDS} (${pct(ownedCardCount(p), TOTAL_CARDS)}%)`],
        ['Achievements', `${ach.earned} / ${ach.total} (${pct(ach.earned, ach.total)}%)`],
      ],
    },
    {
      title: 'Fortune',
      rows: [
        ['Spirit stones on hand', `${p.spiritStones || 0}`],
        ['Spirit stones won in battle', `${st.stonesWon || 0}`],
        ['Sect disciples', `${(p.guild?.members ?? []).length}`],
        ['Disciples on missions', `${activeSectMissions(p)}`],
        ['Alchemy pills in pouch', `${pillsHeld(p)}`],
      ],
    },
    {
      title: 'Ascension & Mastery',
      rows: [
        ['Ascension tier', asc > 0 ? `${asc} (+${Math.round(asc * ASCENSION_STAT_PER_TIER * 100)}% stats)` : '0'],
        ['Meridians opened', `${meridiansOpened(p)} / ${MERIDIAN_LIST.length}`],
        ['Meridian ranks channelled', `${meridianRankTotal(p)}`],
        ['Gems socketed', `${gemsSocketed(p)}`],
        ['Gear set bonus', setActive(p) ? 'Active' : 'Inactive'],
      ],
    },
    {
      title: 'Journey',
      rows: [['Time cultivated (active)', formatDuration(st.msPlayed)]],
    },
  ];
}

// =====================================================================
// UI — own button + modal (no ui.js).
// =====================================================================

let bound = false;

export function initStats(state) {
  if (bound) return;
  bound = true;

  const nav = document.getElementById('nav-menu');
  if (nav && !document.getElementById('btn-stats')) {
    const btn = document.createElement('button');
    btn.id = 'btn-stats';
    btn.type = 'button';
    btn.className = 'stats-btn';
    btn.title = 'Chronicle of Deeds — your lifetime statistics';
    btn.textContent = '📊 Chronicle of Deeds';
    btn.addEventListener('click', () => openStats(state));
    nav.appendChild(btn);
  }
  buildModal();
}

function buildModal() {
  if (document.getElementById('stats-overlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'stats-overlay';
  overlay.className = 'hidden';
  overlay.innerHTML = `
    <div id="stats-panel">
      <div id="stats-header">
        <h2>Chronicle of Deeds</h2>
        <button id="btn-close-stats" type="button" title="Close">✕</button>
      </div>
      <div id="stats-body"></div>
    </div>`;
  document.body.append(overlay);
  document.getElementById('btn-close-stats').addEventListener('click', closeStats);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeStats(); });
}

function openStats(state) {
  renderStats(state);
  document.getElementById('stats-overlay').classList.remove('hidden');
}

function closeStats() {
  document.getElementById('stats-overlay').classList.add('hidden');
}

export function renderStats(state) {
  const body = document.getElementById('stats-body');
  if (!body) return;
  body.innerHTML = '';
  for (const section of statsSummary(state)) {
    const sec = document.createElement('div');
    sec.className = 'stats-section';
    const h = document.createElement('h3');
    h.textContent = section.title;
    sec.append(h);
    for (const [label, value] of section.rows) {
      const row = document.createElement('div');
      row.className = 'stats-row';
      const l = document.createElement('span');
      l.className = 'stats-label';
      l.textContent = label;
      const v = document.createElement('span');
      v.className = 'stats-value';
      v.textContent = value;
      row.append(l, v);
      sec.append(row);
    }
    body.append(sec);
  }
}
