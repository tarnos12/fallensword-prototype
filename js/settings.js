// Settings / preferences modal. A single ⚙ panel that consolidates the game's
// scattered display preferences and housekeeping actions into one place:
//   • Instant combat — the resolve-instantly toggle (relocated here from the
//     combat panel). The checkbox keeps its `#chk-instant` id, so `ui.js`'s
//     existing `initCombatSettings()` still binds it and `playCombat` still
//     reads the same localStorage key — no combat-logic change, just a new home.
//   • Replay tutorial — reopens the first-run guided intro by triggering the
//     tutorial module's own ❔ Help button, so we don't reach into its internals.
//   • Reset save — the "Abandon Cultivation" action (relocated here from the
//     side column). It keeps its `#btn-reset` id, so `main.js`'s existing
//     confirm-and-reset handler still drives it.
//
// The module owns only the modal's open/close wiring plus the one new action
// (replay tutorial); the relocated controls stay bound by their original code,
// which keeps this a genuinely low-conflict, additive feature.

import { initThemeControl } from './theme.js';

const $ = (id) => document.getElementById(id);

export function initSettings() {
  const overlay = $('settings-overlay');
  if (!overlay) return;

  initThemeControl(); // Appearance section: light/dark theme toggle (task AA)

  const open = () => overlay.classList.remove('hidden');
  const close = () => overlay.classList.add('hidden');

  $('btn-settings')?.addEventListener('click', open);
  $('btn-close-settings')?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  // Replay tutorial: reuse the tutorial module's own Help button (created by
  // initTutorial). Close Settings first so the tutorial overlay is unobstructed.
  $('btn-replay-tutorial')?.addEventListener('click', () => {
    close();
    $('btn-help')?.click();
  });
}
