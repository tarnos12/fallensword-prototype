// Dev tooling (Wave 2, doc 40 §4/§5) — the force-100%-drops flag + the on-map
// debug spawn bar. Reintroduces dev scaffolding (stripped in PR #13) for this
// build wave per the author's explicit ask + the lead's ruling: ALWAYS gated
// behind ?dev=1, so it never renders for a normal player. Revisit (possibly
// re-strip) at the next TESTING pass before a real 1.0 cut.
//
// Two halves:
//   1. Pure, Node-safe readers (isDevMode / isForceDropsOn) — guarded against a
//      missing `location`/`localStorage` so game.js can import isForceDropsOn
//      into the engine layer without dragging any DOM dependency in. Mirrors
//      ui.js's isInstant()/INSTANT_KEY pattern: a testing preference with its own
//      localStorage key, NOT in the save schema.
//   2. initDebugBar — POPULATES the existing #debug-bar container (added in
//      Wave 1 as the first child of #map-panel, above #map-grid). DOM only; no
//      index.html/ui.js edits. main.js wires it (the lead does integration).

const FORCE_DROPS_KEY = 'fallen-immortal-dev-force-drops';

// ?dev=1 in the query string. Node-safe (no `location` in headless sims → false).
export function isDevMode() {
  if (typeof location === 'undefined') return false;
  try {
    return new URLSearchParams(location.search).get('dev') === '1';
  } catch {
    return false;
  }
}

// The force-100%-drops toggle state. Node-safe so game.js's attack() drop branch
// can read it in headless sims (returns false with no localStorage).
export function isForceDropsOn() {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(FORCE_DROPS_KEY) === '1';
}

function setForceDrops(on) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(FORCE_DROPS_KEY, on ? '1' : '0');
}

// Inject the debug bar's tiny self-contained stylesheet once, so the bar is
// usable regardless of the main CSS (owned by another agent). Guarded.
function ensureStyle() {
  if (document.getElementById('debug-bar-style')) return;
  const style = document.createElement('style');
  style.id = 'debug-bar-style';
  style.textContent = `
    #debug-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 6px;
      padding: 6px 8px; margin-bottom: 6px; border: 1px dashed #b5651d;
      border-radius: 6px; background: rgba(181,101,29,0.08); font-size: 12px; }
    #debug-bar::before { content: 'DEV'; font-weight: 700; letter-spacing: 1px;
      color: #b5651d; margin-right: 4px; }
    #debug-bar .debug-btn { cursor: pointer; padding: 3px 8px; border-radius: 4px;
      border: 1px solid #b5651d; background: #2a2018; color: #f0e6d2; font-size: 12px; }
    #debug-bar .debug-btn:hover { background: #3a2c1e; }
    #debug-bar .debug-toggle { display: inline-flex; align-items: center; gap: 4px;
      margin-left: auto; color: #d8c9a8; cursor: pointer; }`;
  document.head.appendChild(style);
}

// Populate the existing #debug-bar with spawn buttons + a force-drops toggle.
// `actions` = { spawnLegendary, spawnSuperElite, spawnTitan } (game.js debug
// wrappers, each taking `state`); `onChange` re-renders after a spawn. Spawns
// bypass the natural 1-per-zone caps — the author needs MULTIPLE for testing, so
// each button can be clicked repeatedly to stack rares onto the current tile.
export function initDebugBar(state, actions, onChange) {
  // Prototype testing build: the spawn bar renders for everyone (the author needs
  // it in the playable artifact, which has no ?dev=1). Re-gate behind isDevMode()
  // at the pre-1.0 TESTING pass before a real player-facing cut.
  const bar = document.getElementById('debug-bar');
  if (!bar) return;         // Wave-1 container missing — nothing to populate
  if (bar.dataset.populated === '1') return; // idempotent
  bar.dataset.populated = '1';
  ensureStyle();

  const mkBtn = (label, fn) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'debug-btn';
    b.textContent = label;
    b.addEventListener('click', () => {
      fn(state);
      if (onChange) onChange();
    });
    return b;
  };

  bar.append(
    mkBtn('+ Legendary', actions.spawnLegendary),
    mkBtn('+ Super Elite', actions.spawnSuperElite),
    mkBtn('+ Titan', actions.spawnTitan),
  );

  const toggle = document.createElement('label');
  toggle.className = 'debug-toggle';
  toggle.title = 'Force ALL kills (normal / Legendary / Super-Elite) to drop gear at 100%. Titan is already 100%.';
  const chk = document.createElement('input');
  chk.type = 'checkbox';
  chk.checked = isForceDropsOn();
  chk.addEventListener('change', () => setForceDrops(chk.checked));
  toggle.append(chk, document.createTextNode(' Force 100% drops'));
  bar.appendChild(toggle);
}
