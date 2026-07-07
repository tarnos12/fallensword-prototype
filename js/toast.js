// Unified toast / feedback system (Stage 3, task X). A single queue-based API —
// `toast(message, type)` with type ∈ {info, success, warn, error} — for the
// high-signal moments that were previously buried in the Chronicle log: loot
// drops, breakthroughs, purchases, quest/bounty claims, and *errors* ("not
// enough spirit stones", "pack full"). One consistent feedback language any
// module can call.
//
// Coordination with the existing achievements toast (achievements.js): that one
// is intentionally left as-is (it's out of this task's file scope). To avoid two
// competing styles, these toasts **share its visual language** (same panel card,
// coloured accent, slide/fade) but live in their **own host at a different
// anchor** (top-centre) so achievement "unlock" celebrations (bottom-right) and
// transient action feedback (top-centre) never overlap. Styles live in their own
// sheet (css/toast.css), not appended to style.css. No save fields.

import { sfx } from './audio.js';

const MAX_VISIBLE = 3;   // cap concurrent toasts; the rest queue and pump in
const DURATION_MS = 3500; // auto-dismiss after this long on screen
const EXIT_MS = 320;      // must match the css transition duration

const TYPES = new Set(['info', 'success', 'warn', 'error']);
const ICONS = { info: 'ℹ', success: '✓', warn: '⚠', error: '✕' };
// Toast type → audio cue (js/audio.js). One-directional: toast → audio.
const SFX = { success: 'reward', warn: 'deny', error: 'deny', info: 'info' };

const pending = []; // queued {message, type} not yet shown
const live = [];    // on-screen { node, timer }

let host = null;

function ensureHost() {
  if (host && host.isConnected !== false) return host;
  host = document.getElementById('toast-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toast-host';
    host.setAttribute('aria-live', 'polite');
    document.body.appendChild(host);
  }
  return host;
}

// Public API. Enqueue a toast; pumps immediately if a slot is free.
export function toast(message, type = 'info') {
  const t = TYPES.has(type) ? type : 'info';
  const message_ = message == null ? '' : String(message);
  if (!message_) return;
  pending.push({ message: message_, type: t });
  pump();
}

function pump() {
  while (live.length < MAX_VISIBLE && pending.length) {
    render(pending.shift());
  }
}

function render(item) {
  ensureHost();
  sfx(SFX[item.type]); // audio feedback (no-op if muted / unknown / no audio)
  const node = document.createElement('div');
  node.className = `toast toast-${item.type}`;
  node.setAttribute('role', item.type === 'error' || item.type === 'warn' ? 'alert' : 'status');
  const icon = document.createElement('span');
  icon.className = 'toast-icon';
  icon.textContent = ICONS[item.type];
  const msg = document.createElement('span');
  msg.className = 'toast-msg';
  msg.textContent = item.message; // textContent: never interpret message as HTML
  node.append(icon, msg);
  host.appendChild(node);

  const entry = { node, timer: null };
  live.push(entry);
  // Fade/slide in next frame so the transition runs.
  requestAnimationFrame(() => node.classList.add('show'));
  entry.timer = setTimeout(() => dismiss(entry), DURATION_MS);
  node.addEventListener('click', () => dismiss(entry)); // click to dismiss early
}

function dismiss(entry) {
  const i = live.indexOf(entry);
  if (i === -1) return; // already dismissed
  live.splice(i, 1);
  clearTimeout(entry.timer);
  entry.node.classList.remove('show');
  setTimeout(() => entry.node.remove(), EXIT_MS);
  pump(); // a slot freed up — show the next queued toast
}

export function initToasts() {
  ensureHost();
}

// --- test hooks (headless): inspect queue state and force a dismiss without
// waiting on real timers. Not used by the app. ---
export function __toastState() {
  return { pending: pending.length, live: live.length };
}
export function __dismissOldestForTest() {
  if (live.length) dismiss(live[0]);
}
