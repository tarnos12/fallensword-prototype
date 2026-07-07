// Ascension / New Game+ (Stage 3, task V). At the peak of cultivation (max
// realm), a cultivator can shatter their foundation and begin anew — a prestige
// reset that wipes their progression (level, stats, gear, techniques) but keeps
// their collections (Spirit Cards, Beast Codex, sect, social) and grants a
// PERMANENT stat multiplier that stacks with every ascension. The multiplier is
// `player.ascension` (a plain integer), applied as the final scalar in
// progression.js `effectiveStats` — so a fresh post-ascension run is measurably
// stronger, and the loop rewards replay.
//
// `player.ascension` is additive/back-filled (defaults to 0), no VERSION bump.
// This module owns the reset logic (`performAscension`) + its own ✦ button,
// modal, and stylesheet (self-injected like crafting.js/sectmissions.js — no
// index.html, no ui.js). The game layer (`game.js` `ascend`) wraps it to reset
// Qi, log, and persist.

import { MAX_STAGE, ASCENSION_STAT_PER_TIER } from './progression.js';

export function getAscension(player) {
  return player.ascension ?? 0;
}

// Percent stat bonus at a given ascension count (for display).
export function ascensionBonusPct(count) {
  return Math.round(ASCENSION_STAT_PER_TIER * count * 100);
}

// Ascension is available once the player has reached the final stage of the
// final realm (the top of the current ladder — grows automatically as realms
// are added).
export function canAscend(player) {
  return (player.level ?? 1) >= MAX_STAGE;
}

// The prestige reset. Mutates the player in place: bumps the ascension count,
// wipes progression + gear + techniques, and keeps collections/meta. Returns a
// summary. (Qi is reset by the game-layer wrapper, which owns maxQi.)
export function performAscension(player) {
  if (!canAscend(player)) return { ok: false, reason: 'Reach the peak of cultivation before ascending.' };
  player.ascension = getAscension(player) + 1;

  // --- wiped: the cultivation run itself ---
  player.level = 1;
  player.xp = 0;
  player.statPoints = 0;
  player.skillPoints = 0;
  player.allocated = { attack: 0, defense: 0, damage: 0, armor: 0, hp: 0 };
  player.equipment = { weapon: null, robe: null };
  player.inventory = [];
  player.learnedTechniques = [];
  player.activeBuffs = [];
  player.spiritStones = 20; // back to a starting purse
  player.meridians = { nodes: {} }; // points are level-derived, so ranks reset too
  player.loadouts = []; // saved sets referenced the now-wiped gear

  // --- kept: everything else (cards, bestiary/codex, guild, rivals, sparRecord,
  // achievements ledger, boss/trial/bounty progress, lifetime stats) is left
  // untouched — that's the point of a prestige loop. ---

  return { ok: true, ascension: player.ascension, bonusPct: ascensionBonusPct(player.ascension) };
}

// =====================================================================
// Rendering — self-contained (button + modal + stylesheet injected).
// =====================================================================

const $ = (id) => document.getElementById(id);
let provider = null; // { state }
let actions = null;
let overlay = null;

function ensureStylesheet() {
  if (document.querySelector('link[data-ascension]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'css/ascension.css';
  link.setAttribute('data-ascension', '');
  document.head.appendChild(link);
}

export function renderAscension(state) {
  const body = $('ascension-body');
  if (!body) return;
  const p = state.player;
  const count = getAscension(p);
  const ready = canAscend(p);
  const nextPct = ascensionBonusPct(count + 1);

  body.innerHTML = `
    <div class="asc-status">
      <div class="asc-tier">Ascension <strong>${count}</strong></div>
      <div class="asc-bonus dim">Current bonus: <strong>+${ascensionBonusPct(count)}%</strong> to all stats</div>
    </div>
    <p class="asc-intro">Shatter your foundation and begin the climb anew. Each ascension is permanent and stacks — the road is the same, but you walk it stronger.</p>
    <div class="asc-cols">
      <div class="asc-col asc-keep"><h3>Kept forever</h3><ul>
        <li>Spirit Cards &amp; Beast Codex</li>
        <li>Your Sect, Rivals &amp; spar record</li>
        <li>Achievements &amp; lifetime stats</li>
        <li><strong>+${ASCENSION_STAT_PER_TIER * 100}% permanent stats</strong> per ascension</li>
      </ul></div>
      <div class="asc-col asc-wipe"><h3>Reset to zero</h3><ul>
        <li>Cultivation level &amp; XP</li>
        <li>Allocated stats, meridians &amp; techniques</li>
        <li>All artifacts &amp; loadouts</li>
        <li>Spirit stones (back to a starting purse)</li>
      </ul></div>
    </div>`;

  const action = document.createElement('button');
  action.id = 'btn-do-ascend';
  action.type = 'button';
  action.className = ready ? 'asc-go claim-btn' : 'asc-go';
  action.disabled = !ready;
  action.textContent = ready ? `✦ Ascend — become Ascension ${count + 1} (+${nextPct}% stats)` : 'Reach the peak of cultivation to ascend';
  if (ready) {
    action.addEventListener('click', () => {
      if (confirm(`Ascend to tier ${count + 1}? Your level, gear, techniques and meridians reset to zero. You keep your cards, codex, and gain a permanent +${nextPct}% to all stats. This cannot be undone.`)) {
        actions.ascend();
      }
    });
  }
  body.appendChild(action);
}

export function initAscension(state, acts) {
  provider = { state };
  actions = acts;
  ensureStylesheet();

  const btn = document.createElement('button');
  btn.id = 'btn-ascension';
  btn.type = 'button';
  btn.className = 'ascension-nav-btn';
  btn.title = 'Ascension — at the peak of cultivation, reset for a permanent power bonus';
  btn.textContent = '✦ Ascension';
  ($('nav-menu') ?? document.getElementById('char-panel'))?.appendChild(btn);

  overlay = document.createElement('div');
  overlay.id = 'ascension-overlay';
  overlay.className = 'hidden';
  overlay.innerHTML = `
    <div id="ascension-panel">
      <div id="ascension-header">
        <h2>Ascension</h2>
        <button id="btn-close-ascension" type="button" title="Close">✕</button>
      </div>
      <div id="ascension-body"></div>
    </div>`;
  document.body.appendChild(overlay);

  const open = () => { renderAscension(state); overlay.classList.remove('hidden'); };
  const close = () => overlay.classList.add('hidden');
  btn.addEventListener('click', open);
  $('btn-close-ascension').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
}
