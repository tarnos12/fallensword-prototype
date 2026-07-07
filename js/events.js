// World events / calendar (Stage 3, task R). A deterministic, repeating
// wall-clock calendar of global buffs — the active event is a pure function of
// the clock (like the Pavilion rotation and the Recently-Active feed), so it
// needs NO persistence and is identical for every player at a given moment.
// The game layer reads the active event's reward multipliers in one guarded spot
// in the combat reward path; this module also owns a small HUD banner.
//
// Kept a leaf: game.js imports the multiplier helper, main.js drives the banner.
// Purely additive — nothing here mutates or persists game state.

const WINDOW_MS = 20 * 60 * 1000; // each event holds for 20 real minutes, then rotates

// The rotation. `xpMult`/`stoneMult` feed the reward path; a neutral "Serene
// Skies" window keeps the world from being permanently buffed (so a buff feels
// like an occasion). Order is the rotation order.
export const EVENTS = [
  { id: 'calm', icon: '🌙', name: 'Serene Skies', blurb: 'The heavens are quiet. No omens stir.', xpMult: 1, stoneMult: 1 },
  { id: 'enlightenment', icon: '✨', name: 'Enlightenment Tide', blurb: 'Insight comes easily — +50% cultivation XP from battle.', xpMult: 1.5, stoneMult: 1 },
  { id: 'spirit_torrent', icon: '💰', name: 'Spirit Torrent', blurb: 'Spirit qi runs rich — +50% spirit stones from battle.', xpMult: 1, stoneMult: 1.5 },
  { id: 'heavens_bounty', icon: '🌟', name: "Heaven's Bounty", blurb: 'Fortune favours the bold — +25% XP and +25% spirit stones.', xpMult: 1.25, stoneMult: 1.25 },
  { id: 'blood_moon', icon: '🌑', name: 'Blood Moon', blurb: 'The moon runs red — +75% spirit stones from battle.', xpMult: 1, stoneMult: 1.75 },
];

// The active event and when it ends, derived from the clock.
export function activeEvent(now = Date.now()) {
  const bucket = Math.floor(now / WINDOW_MS);
  const event = EVENTS[bucket % EVENTS.length];
  const endsAt = (bucket + 1) * WINDOW_MS;
  return { event, endsAt, msLeft: endsAt - now };
}

// The reward multipliers the game layer applies (defaults to 1× — a no-op when
// the calm window is active). Kept tiny so the game.js call site is one guarded line.
export function eventReward(now = Date.now()) {
  const { event } = activeEvent(now);
  return { xpMult: event.xpMult, stoneMult: event.stoneMult };
}

// Is the active event actually granting a bonus (vs the calm window)?
export function eventIsBuff(now = Date.now()) {
  const { event } = activeEvent(now);
  return event.xpMult !== 1 || event.stoneMult !== 1;
}

// =====================================================================
// HUD banner — a slim strip under the header. Owns its own DOM.
// =====================================================================

let banner = null;

export function initEventBanner() {
  if (banner) return;
  const header = document.getElementById('header');
  if (!header) return;
  banner = document.createElement('div');
  banner.id = 'event-banner';
  banner.setAttribute('role', 'status');
  header.insertAdjacentElement('afterend', banner);
  renderEventBanner();
}

function fmt(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}m ${String(s % 60).padStart(2, '0')}s`;
}

export function renderEventBanner(now = Date.now()) {
  if (!banner) return;
  const { event, msLeft } = activeEvent(now);
  banner.className = eventIsBuff(now) ? `event-active event-${event.id}` : 'event-calm';
  banner.innerHTML =
    `<span class="event-icon">${event.icon}</span>` +
    `<span class="event-name">${event.name}</span>` +
    `<span class="event-blurb">${event.blurb}</span>` +
    `<span class="event-timer">next in ${fmt(msLeft)}</span>`;
}
