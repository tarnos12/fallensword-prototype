// =====================================================================
// Full-view tab controller (UI/UX revamp).
//
// Top-level tabs switch the entire main area — only one .tab-view shows at a
// time, so the page never scrolls. Markup lives in index.html (#tab-bar +
// .tab-view sections carrying data-tab); this module only toggles the active
// one and exposes helpers for other systems:
//   • setActiveTab(id)      — programmatic switch (combat auto-switch, etc.)
//   • revealElementById(id) — activate whichever tab holds an element
//                             (used by the first-run tutorial so its spotlight
//                             lands on the right screen).
//
// Presentation-only: it never touches game state or ui.js render functions.
// Every element id in the views is unchanged, so all existing bindings hold.
// =====================================================================

// IA restructure (Wave 1): Combat tab deleted (combat resolves in a Map
// side-panel) and Halls dissolved. UI-shell revamp adds the Profile surface.
// The switchable views (nav lives in the left #sidebar now):
const TABS = ['map', 'profile', 'cultivator', 'equipment', 'records', 'skills', 'quests', 'pavilion', 'merit'];
let active = 'map';
let bound = false;

// Optional per-switch hook (registered by main.js). Lets a view refresh its
// contents the moment it's revealed (e.g. the Profile page) without tabs.js
// importing any game logic. Kept presentation-neutral: it just forwards the id.
let onChange = null;
export function setTabChangeHandler(fn) { onChange = fn; }

function views() {
  return Array.from(document.querySelectorAll('#layout .tab-view'));
}
function buttons() {
  // Nav lives in the left sidebar now; only the view-switching entries carry
  // .tab-btn (modal-opening links in the sidebar do not).
  return Array.from(document.querySelectorAll('#sidebar .tab-btn'));
}

export function activeTab() {
  return active;
}

// Switch to a tab by its data-tab id. No-op for an unknown id or when the tab
// bar isn't present. Idempotent — safe to call with the already-active tab.
export function setActiveTab(id) {
  if (!TABS.includes(id)) return;
  active = id;
  for (const v of views()) {
    v.classList.toggle('tab-active', v.dataset.tab === id);
  }
  for (const b of buttons()) {
    const on = b.dataset.tab === id;
    b.classList.toggle('tab-active', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
    b.setAttribute('tabindex', on ? '0' : '-1');
  }
  // Scroll the freshly shown view back to the top so each screen reads from
  // its start rather than a stale scroll position.
  const view = views().find((v) => v.dataset.tab === id);
  if (view) view.scrollTop = 0;
  if (onChange) onChange(id);
}

// Find the tab-view that contains the element with the given id and activate
// it. Returns true if a switch happened (element lives in a tab), false if the
// element is outside the tabbed area (e.g. the always-visible HUD) or missing.
export function revealElementById(id) {
  const el = document.getElementById(id);
  if (!el) return false;
  const view = el.closest('.tab-view');
  if (!view || !view.dataset.tab) return false;
  setActiveTab(view.dataset.tab);
  return true;
}

export function initTabs() {
  if (bound) return;
  bound = true;

  const btns = buttons();
  if (!btns.length) return; // markup missing — nothing to wire

  btns.forEach((btn) => {
    btn.addEventListener('click', () => setActiveTab(btn.dataset.tab));
    // Roving-tabindex arrow-key navigation across the tablist (ARIA pattern).
    btn.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      const list = buttons();
      const i = list.indexOf(btn);
      const next = e.key === 'ArrowRight'
        ? list[(i + 1) % list.length]
        : list[(i - 1 + list.length) % list.length];
      setActiveTab(next.dataset.tab);
      next.focus();
    });
  });

  // Establish a clean initial state (markup ships with map active).
  setActiveTab(active);
}
