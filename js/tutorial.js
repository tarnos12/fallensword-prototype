// Onboarding / tutorial (GDD Stage 2 exit criteria: "a stranger can play with
// zero explanation"). A dismissible, step-by-step overlay that walks a new
// cultivator through the real UI — movement, Qi, combat, the character sheet,
// gear, techniques, and the Codex / Pavilion / Sect systems — highlighting the
// actual element each step describes.
//
// Deliberately self-contained: this module builds ALL its own DOM (the help
// button and the overlay), so it needs no markup in index.html and never
// touches ui.js — keeping its footprint to one import in main.js plus a scoped
// CSS section, so it can be developed in parallel without colliding with other
// work. "Seen" state is a display preference in its own localStorage key (like
// the instant-combat toggle), so it never touches the save schema.

import { revealElementById } from './tabs.js';

const SEEN_KEY = 'fallen-immortal-tutorial-seen';

// Each step: a title, body copy, and an optional element id to spotlight. Steps
// with a missing target still work — the spotlight is skipped gracefully.
const STEPS = [
  {
    title: 'Welcome, cultivator',
    target: null,
    body: `You are a nameless disciple stepping into the wilds to cultivate toward immortality. This is a stat-driven dungeon crawler — every outcome comes from numbers you can read, not hidden dice. Let's walk the essentials. You can skip anytime and reopen this from the <b>❔ Help</b> button.`,
  },
  {
    title: 'The world map',
    target: 'map-grid',
    body: `Each tile is a step in the vale. Click an <b>adjacent</b> tile to move — orthogonal costs 1 Qi, diagonal costs 2. Red dots are demonic beasts; the ☯ marker is you. Danger rises the further you roam from the Sect Gate.`,
  },
  {
    title: 'Qi — your lifeblood',
    target: 'chip-qi',
    body: `Qi (spiritual energy) powers movement and combat. It regenerates on a real-world clock — <b>even while the game is closed</b> — so you can check in, spend it, and come back later. Attacking needs a full reserve up front.`,
  },
  {
    title: 'Facing a beast',
    target: 'tile-info',
    body: `When creatures share your tile they appear here. Press <b>👁 Inspect</b> to preview a foe's level and stats before committing Qi, then <b>Attack</b>. Combat resolves instantly (toggle turn-by-turn playback if you like) — win for XP, spirit stones, and loot; lose only a little; a 20-turn stalemate means "come back stronger."`,
  },
  {
    title: 'Cultivation & stats',
    target: 'char-sheet',
    body: `Winning fills your cultivation bar; a <b>breakthrough</b> raises your stage and grants stat points. Spend them here — veterans pour into Attack and Damage so they one-shot foes at their level. Two stats per row; hover any for its breakdown.`,
  },
  {
    title: 'Artifacts',
    target: 'gear-box',
    body: `Equip weapons and robes from your pack (click to equip, right-click to sell/destroy). Gear has a rarity ladder and <b>degrades with use</b> — repair it at the Sect Gate before it breaks and stops giving bonuses.`,
  },
  {
    title: 'Techniques',
    target: 'tech-box',
    body: `Learn techniques with banked points, then <b>channel</b> them for timed, Qi-cost buffs before a hard fight. They stack on top of your gear through the same stat pipeline.`,
  },
  {
    title: 'Deeper systems',
    target: 'btn-codex',
    body: `Three collections reward the grind: <b>📖 Beast Codex</b> tracks kills and drops Spirit Cards (always-on passive bonuses); <b>🏛 Treasure Pavilion</b> is an auction house to buy and sell gear; <b>⛩ Sect</b> lets you recruit disciples for permanent buffs. Explore them as you grow.`,
  },
  {
    title: 'The path is yours',
    target: null,
    body: `That's everything you need to begin. Reopen this guide anytime from <b>❔ Help</b>. May your cultivation know no bottleneck — good luck.`,
  },
];

const $ = (id) => document.getElementById(id);

let overlay = null;
let helpBtn = null;
let current = 0;
let lastHighlight = null;

function hasSeen() {
  return localStorage.getItem(SEEN_KEY) === '1';
}

function markSeen() {
  localStorage.setItem(SEEN_KEY, '1');
}

function clearHighlight() {
  if (lastHighlight) {
    lastHighlight.classList.remove('tut-highlight');
    lastHighlight = null;
  }
}

function highlight(targetId) {
  clearHighlight();
  if (!targetId) return;
  // Full-view tabs: the spotlight target may live on a hidden tab (char sheet,
  // gear, techniques, the Halls buttons…). Switch to its tab first so the
  // highlight lands on a visible element. No-op for always-visible HUD targets.
  revealElementById(targetId);
  const el = $(targetId);
  if (!el) return;
  el.classList.add('tut-highlight');
  lastHighlight = el;
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

function renderStep() {
  const step = STEPS[current];
  const dots = STEPS.map((_, i) => `<span class="tut-dot${i === current ? ' active' : ''}"></span>`).join('');
  overlay.querySelector('.tut-card').innerHTML = `
    <div class="tut-step-count">Step ${current + 1} of ${STEPS.length}</div>
    <h2 class="tut-title">${step.title}</h2>
    <p class="tut-body">${step.body}</p>
    <div class="tut-dots">${dots}</div>
    <div class="tut-actions">
      <button type="button" class="tut-skip">Skip</button>
      <span class="tut-nav">
        <button type="button" class="tut-back"${current === 0 ? ' disabled' : ''}>Back</button>
        <button type="button" class="tut-next">${current === STEPS.length - 1 ? 'Begin' : 'Next'}</button>
      </span>
    </div>`;
  overlay.querySelector('.tut-skip').addEventListener('click', close);
  overlay.querySelector('.tut-back').addEventListener('click', () => go(current - 1));
  overlay.querySelector('.tut-next').addEventListener('click', () => {
    if (current === STEPS.length - 1) close();
    else go(current + 1);
  });
  highlight(step.target);
}

function go(i) {
  current = Math.max(0, Math.min(STEPS.length - 1, i));
  renderStep();
}

function open() {
  current = 0;
  overlay.classList.remove('hidden');
  renderStep();
}

function close() {
  clearHighlight();
  overlay.classList.add('hidden');
  markSeen();
}

function build() {
  // Help button — lives in the header so it's always reachable.
  helpBtn = document.createElement('button');
  helpBtn.type = 'button';
  helpBtn.id = 'btn-help';
  helpBtn.className = 'help-btn';
  helpBtn.title = 'Reopen the tutorial';
  helpBtn.textContent = '❔ Help';
  helpBtn.addEventListener('click', open);
  const header = $('header');
  if (header) header.appendChild(helpBtn);

  // Overlay + card.
  overlay = document.createElement('div');
  overlay.id = 'tutorial-overlay';
  overlay.className = 'hidden';
  overlay.innerHTML = '<div class="tut-card"></div>';
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close(); // click the scrim to dismiss
  });
  document.body.appendChild(overlay);
}

export function initTutorial() {
  build();
  if (!hasSeen()) open(); // first-run auto-start
}
