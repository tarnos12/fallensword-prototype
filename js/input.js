// Accessibility & keyboard input (Stage 3, task L). Makes the game keyboard-
// playable and friendlier to screen readers, without touching combat/game logic:
//   • Arrow keys / WASD  → move to the adjacent tile (reuses the game's own move
//     path via the injected `move(dx, dy)` callback — no duplicated `tryMove`).
//   • Esc                → close the top-most open modal.
//   • Digit keys 1–9     → open the Nth nav panel (📖 🏛 ⛩ 👤 …).
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

function openNavPanel(index) {
  const buttons = document.querySelectorAll('#nav-menu button');
  buttons[index]?.click();
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

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return; // leave browser shortcuts alone
    if (isTypingTarget(e.target)) return;           // don't hijack text fields

    if (e.key === 'Escape') {
      if (closeTopModal()) e.preventDefault();
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

    if (/^[1-9]$/.test(e.key)) {
      e.preventDefault();
      openNavPanel(Number(e.key) - 1);
    }
  });
}
