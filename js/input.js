// Accessibility & keyboard input (Stage 3, task L). Makes the game keyboard-
// playable and friendlier to screen readers, without touching combat/game logic:
//   • Arrow keys / WASD  → move to the adjacent tile (reuses the game's own move
//     path via the injected `move(dx, dy)` callback — no duplicated `tryMove`).
//   • Esc                → close the top-most open modal.
//   • ARIA + a skip link → label the map and modals; `:focus-visible` styling
//     lives in css/a11y.css.
//
// Only `move` is game-coupled (it needs the player position); everything else is
// generic DOM, so this module stays self-contained and main.js wires it in one
// line. Keyboard-only — touch/mobile is a separate module (task Z); the two must
// not share a handler.

// key → grid delta. y grows downward, so Up = -1. Orthogonal only (diagonal
// moves are still available by clicking); this matches typical grid keyboarding.
const MOVE_KEYS = {
  arrowup: [0, -1], w: [0, -1],
  arrowdown: [0, 1], s: [0, 1],
  arrowleft: [-1, 0], a: [-1, 0],
  arrowright: [1, 0], d: [1, 0],
};

const $ = (id) => document.getElementById(id);

function isTypingTarget(t) {
  if (!t) return false;
  const tag = t.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable;
}

// Every modal is an `#*-overlay` div toggled with `.hidden` (plus the tutorial
// overlay, injected at runtime). Visible ones, in DOM order.
function openOverlays() {
  return Array.from(document.querySelectorAll('[id$="-overlay"]'))
    .filter((el) => !el.classList.contains('hidden'));
}

export function isModalOpen() {
  return openOverlays().length > 0;
}

// Close the top-most open modal (last in DOM order — e.g. the duel modal that
// opens over the profile modal). Mirrors the existing scrim-click close
// (`overlay.classList.add('hidden')`). Returns true if something was closed.
export function closeTopModal() {
  const open = openOverlays();
  if (!open.length) return false;
  open[open.length - 1].classList.add('hidden');
  return true;
}

// --- Keyboard-shortcuts help overlay ("?") -------------------------------
// A self-contained modal listing the real key bindings. Injected once into
// <body>; its id ends in `-overlay` and it starts `.hidden`, so the existing
// closeTopModal()/Esc handling and the shared modal CSS pick it up for free.
let shortcutsOverlay = null;

// One shortcut row: a set of <kbd> keys + a description. Built with the DOM API
// (no HTML interpolation) so nothing here can be an injection vector.
function shortcutRow(keys, desc) {
  const row = document.createElement('div');
  row.className = 'shortcut-row';

  const keyWrap = document.createElement('div');
  keyWrap.className = 'shortcut-keys';
  keys.forEach((k) => {
    // '/' and '–' are visual dividers between key groups, not keys themselves.
    if (k === '/' || k === '–') {
      const sep = document.createElement('span');
      sep.className = 'shortcut-sep';
      sep.textContent = k;
      keyWrap.appendChild(sep);
      return;
    }
    const kbd = document.createElement('kbd');
    kbd.textContent = k;
    keyWrap.appendChild(kbd);
  });

  const label = document.createElement('div');
  label.className = 'shortcut-desc';
  label.textContent = desc;

  row.appendChild(keyWrap);
  row.appendChild(label);
  return row;
}

// Build + inject the overlay once. Guarded against double-injection.
export function buildShortcutsOverlay() {
  if (shortcutsOverlay || document.getElementById('shortcuts-overlay')) {
    shortcutsOverlay = document.getElementById('shortcuts-overlay');
    return shortcutsOverlay;
  }

  const overlay = document.createElement('div');
  overlay.id = 'shortcuts-overlay';
  overlay.className = 'hidden';

  const panel = document.createElement('div');
  panel.id = 'shortcuts-panel';
  // ARIA set directly (this runs after applyA11y, so the shared pass won't see it).
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', 'Keyboard shortcuts');

  const header = document.createElement('div');
  header.className = 'shortcuts-header';
  const h2 = document.createElement('h2');
  h2.textContent = 'Keyboard Shortcuts';
  const close = document.createElement('button');
  close.type = 'button';
  close.id = 'btn-close-shortcuts';
  close.title = 'Close';
  close.textContent = '✕';
  header.appendChild(h2);
  header.appendChild(close);

  const body = document.createElement('div');
  body.className = 'shortcuts-body';
  body.appendChild(shortcutRow(['↑', '↓', '←', '→', '/', 'W', 'A', 'S', 'D'], 'Move around the map'));
  body.appendChild(shortcutRow(['Esc'], 'Close the open dialog'));
  body.appendChild(shortcutRow(['?'], 'Show / hide this help'));

  panel.appendChild(header);
  panel.appendChild(body);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  close.addEventListener('click', () => overlay.classList.add('hidden'));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.add('hidden'); });

  shortcutsOverlay = overlay;
  return overlay;
}

// Toggle the help. Opens it (even from the map); if it's already open, closes
// it. If a DIFFERENT modal is open we leave it alone — keeps things simple and
// avoids stacking. Never throws.
function toggleShortcuts() {
  const overlay = shortcutsOverlay || buildShortcutsOverlay();
  if (!overlay) return;
  if (!overlay.classList.contains('hidden')) {
    overlay.classList.add('hidden');
    return;
  }
  if (isModalOpen()) return; // another dialog is up; don't stack over it
  overlay.classList.remove('hidden');
}

// Set dialog semantics on every modal and a descriptive label on the map. Done
// here (not in index.html) so it stays in one place and covers modals injected
// at runtime. Labels are read from each overlay's heading when present.
export function applyA11y() {
  const grid = $('map-grid');
  if (grid) {
    grid.setAttribute('role', 'group');
    grid.setAttribute('aria-label', 'Dungeon map. Move with the arrow keys or W, A, S, D. Press a tile to move or fight there.');
    grid.setAttribute('tabindex', '-1'); // so the skip link can land focus here
  }
  for (const overlay of document.querySelectorAll('[id$="-overlay"]')) {
    const panel = overlay.firstElementChild || overlay;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    if (!panel.getAttribute('aria-label')) {
      const heading = overlay.querySelector('h2, h3');
      panel.setAttribute('aria-label', (heading?.textContent || overlay.id.replace(/-overlay$/, '')).trim());
    }
  }
}

export function initInput({ move }) {
  applyA11y();
  buildShortcutsOverlay(); // inject the "?" help modal once, after the ARIA pass

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return; // leave browser shortcuts alone
    if (isTypingTarget(e.target)) return;           // don't hijack text fields

    if (e.key === 'Escape') {
      if (closeTopModal()) e.preventDefault();
      return;
    }

    // "?" (Shift+/) toggles the keyboard-shortcuts help — works from the map;
    // if the help is already up it closes it (Esc/✕ also close it).
    if (e.key === '?') {
      e.preventDefault();
      toggleShortcuts();
      return;
    }

    // While a modal is open, arrows/digits belong to the dialog, not the map.
    if (isModalOpen()) return;

    const delta = MOVE_KEYS[e.key.toLowerCase()];
    if (delta) {
      e.preventDefault(); // stop arrow keys from scrolling the page
      move(delta[0], delta[1]);
      return;
    }
    // Digit keys 1–9 are intentionally left UNBOUND here (Wave 1): the Halls
    // nav-menu they used to index into is dissolved. Wave 2 (CombatWorld) rebinds
    // them to attack the monster in slot N on the Map surface.
  });
}
