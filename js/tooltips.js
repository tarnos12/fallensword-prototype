// tooltips.js — Global instant-tooltip engine (Slice T1).
//
// The only fast, styled tooltip in the game is the rich ITEM tooltip in ui.js
// (`#tooltip`, shown on hover for gear/stat cells). Everything else — nav
// buttons, modal controls, badges — relies on the native `title=""` bubble,
// which appears after ~1s and looks OS-default. This module gives every such
// element a styled, near-instant tooltip instead.
//
// Design:
//  - One delegated document-level engine, own DOM (`#app-tooltip`).
//  - pointerover/out + focusin/out (keyboard a11y). Target = closest [data-tip]/[title].
//  - Lazy MIGRATION: first time we see an element's `title`, move it to `data-tip`
//    and strip `title` — so the slow native bubble never appears. Elements
//    rendered later migrate on their first hover.
//  - textContent only (never innerHTML) — a title is untrusted display text.
//  - EXCLUSIONS: never fire inside containers the rich item tooltip already
//    serves (`.item-slot`, `.stat-cell` — see ui.js makeItemSlot/renderCharSheet),
//    nor over our own / the item tooltip / the context menu. The two systems
//    must never double-show. Touch interactions are ignored (rich tooltips and
//    native titles are mouse/keyboard affordances).

const SHOW_DELAY = 80; // ms — near-instant, but not flickery when sweeping the cursor
const GAP = 8; // px between target and tooltip

// Anything matching this is off-limits: the rich item tooltip's territory
// (.item-slot / .stat-cell), plus our own overlays. Checked with closest() so
// descendants are excluded too.
const EXCLUDE = '.item-slot, .stat-cell, #tooltip, #app-tooltip, #ctx-menu';

let tipEl = null;
let showTimer = null;
let currentTarget = null;

function ensureTip() {
  if (tipEl) return tipEl;
  tipEl = document.createElement('div');
  tipEl.id = 'app-tooltip';
  tipEl.setAttribute('role', 'tooltip');
  tipEl.setAttribute('aria-hidden', 'true');
  document.body.appendChild(tipEl);
  return tipEl;
}

// Resolve the tipped element for an event target, or null if none / excluded.
function resolveTarget(node) {
  if (!node || typeof node.closest !== 'function') return null;
  if (node.closest(EXCLUDE)) return null;
  const el = node.closest('[data-tip], [title]');
  if (!el) return null;
  if (el.closest(EXCLUDE)) return null;
  return el;
}

// Lazily migrate a native title -> data-tip so the OS bubble never shows.
// Returns the tip text (from data-tip, falling back to a fresh title).
function tipTextFor(el) {
  const title = el.getAttribute('title');
  if (title != null) {
    el.setAttribute('data-tip', title);
    el.removeAttribute('title');
  }
  return el.getAttribute('data-tip') || '';
}

function position(el) {
  const r = el.getBoundingClientRect();
  const tw = tipEl.offsetWidth;
  const th = tipEl.offsetHeight;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Centre horizontally on the target, clamped to the viewport.
  let left = r.left + r.width / 2 - tw / 2;
  left = Math.max(6, Math.min(left, vw - tw - 6));

  // Prefer below; flip above if there's no room and above has more space.
  let top = r.bottom + GAP;
  if (top + th > vh - 6 && r.top - GAP - th > 6) {
    top = r.top - GAP - th;
  }
  top = Math.max(6, Math.min(top, vh - th - 6));

  tipEl.style.left = Math.round(left) + 'px';
  tipEl.style.top = Math.round(top) + 'px';
}

function show(el, text) {
  ensureTip();
  tipEl.textContent = text;
  tipEl.style.left = '-9999px';
  tipEl.style.top = '-9999px';
  tipEl.classList.add('visible');
  tipEl.setAttribute('aria-hidden', 'false');
  position(el); // measure after content + display so offsetWidth/Height are real
}

function hide() {
  if (showTimer) {
    clearTimeout(showTimer);
    showTimer = null;
  }
  currentTarget = null;
  if (tipEl) {
    tipEl.classList.remove('visible');
    tipEl.setAttribute('aria-hidden', 'true');
  }
}

function scheduleShow(el) {
  if (el === currentTarget) return;
  hide();
  currentTarget = el;
  showTimer = setTimeout(() => {
    showTimer = null;
    if (currentTarget !== el || !el.isConnected) return;
    const text = tipTextFor(el);
    if (!text) return;
    show(el, text);
  }, SHOW_DELAY);
}

function onPointerOver(e) {
  if (e.pointerType === 'touch') return; // touch: no hover tooltips
  const el = resolveTarget(e.target);
  if (!el) return;
  scheduleShow(el);
}

function onPointerOut(e) {
  if (e.pointerType === 'touch') return;
  const el = resolveTarget(e.target);
  if (!el) return;
  // Only clear when leaving the element we're tracking (not on inner-child moves).
  const to = e.relatedTarget;
  if (to && el.contains(to)) return;
  if (el === currentTarget) hide();
}

function onFocusIn(e) {
  const el = resolveTarget(e.target);
  if (!el) return;
  scheduleShow(el);
}

function onFocusOut(e) {
  const el = resolveTarget(e.target);
  if (el && el === currentTarget) hide();
}

export function initTooltips() {
  if (window.__appTooltipsInit) return;
  window.__appTooltipsInit = true;
  ensureTip();
  document.addEventListener('pointerover', onPointerOver, true);
  document.addEventListener('pointerout', onPointerOut, true);
  document.addEventListener('focusin', onFocusIn, true);
  document.addEventListener('focusout', onFocusOut, true);
  // Dismiss on any interaction/scroll that would leave the tooltip stranded.
  document.addEventListener('pointerdown', hide, true);
  document.addEventListener('scroll', hide, true);
  window.addEventListener('blur', hide);
}
