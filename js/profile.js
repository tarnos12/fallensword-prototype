// Profile & Rivals feed (GDD §6.5, §6.7). A read-mostly "profile page" over
// data the game already holds: the player's cultivation summary and *every*
// active buff (technique buffs with remaining time, always-on Spirit Card
// bonuses, always-on sect buffs), plus two fake-multiplayer social feeds — a
// "Rivals" list and a "Recently Active" feed — both drawn from the SAME shared
// persona roster (personas.js) that seeds the Treasure Pavilion and the Sect.
// Reusing one cast everywhere is what sells the illusion of a living world: a
// name you bought gear from, recruited as a disciple, and now watch cultivate
// in the feed feels real in a way a fresh random string never would (GDD §6.5).
//
// Like market.js / guild.js this lives behind a provider interface
// (createProfileProvider) so a 2.0 network layer can implement the same shape
// against real players. It is deliberately self-contained — it owns its own
// rendering (initProfile/renderProfile) rather than routing through ui.js — so
// it stays out of the other parallel sessions' shared-file edits.

import { PERSONAS, personaById, personaLabel } from './personas.js';
import { activeBuffs, get as getTech } from './techniques.js';
import { cardBonuses, ownedCardCount } from './cards.js';
import { guildBuffs } from './guild.js';
import { effectiveStats } from './progression.js';
import { stageName, realmFor } from './progression.js';
import { mulberry32 } from './rng.js';
import { saveGame } from './save.js';

const $ = (id) => document.getElementById(id);

// --- Rivals: an asymmetric "add anyone as an ally/enemy" list (GDD §6.5),
// reskinned here as Rivals. Persona ids live on `player.rivals`; because the
// whole player object is serialized by save.js, this new field round-trips for
// free — we just lazily back-fill it for old saves that predate it. ---

function rivalIds(player) {
  if (!Array.isArray(player.rivals)) player.rivals = [];
  return player.rivals;
}

export function isRival(player, personaId) {
  return rivalIds(player).includes(personaId);
}

function addRival(state, personaId) {
  const ids = rivalIds(state.player);
  if (!personaById(personaId) || ids.includes(personaId)) return { ok: false };
  ids.push(personaId);
  saveGame(state);
  return { ok: true, persona: personaById(personaId) };
}

function removeRival(state, personaId) {
  const ids = rivalIds(state.player);
  const i = ids.indexOf(personaId);
  if (i === -1) return { ok: false };
  ids.splice(i, 1);
  saveGame(state);
  return { ok: true, persona: personaById(personaId) };
}

// --- Unified active-buff view. Three sources feed the effectiveStats pipeline
// (GDD §7.3); the profile surfaces all of them in one list, matching the FS
// profile page's "currently active buffs and their remaining time". ---

const STAT_LABELS = { attack: 'Attack', defense: 'Defense', damage: 'Damage', armor: 'Armor', hp: 'Max HP', maxHp: 'Max HP' };

function techniqueBuffViews(player, now) {
  return activeBuffs(player, now).map((b) => {
    const t = getTech(b.techniqueId);
    const effText = Object.entries(b.effect)
      .map(([s, v]) => `${v > 0 ? '+' : ''}${Math.round(v * 100)}% ${STAT_LABELS[s] ?? s}`)
      .join(', ');
    return {
      source: 'Technique',
      name: t?.name ?? b.techniqueId,
      detail: effText,
      remainingMs: Math.max(0, b.expiresAt - now),
    };
  });
}

function cardBuffViews(player) {
  const { stat, meta } = cardBonuses(player);
  const views = [];
  for (const [s, v] of Object.entries(stat)) {
    if (v) views.push({ source: 'Spirit Card', name: `${STAT_LABELS[s] ?? s} attunement`, detail: `+${v} ${STAT_LABELS[s] ?? s}`, remainingMs: null });
  }
  if (meta.qiCap) views.push({ source: 'Spirit Card', name: 'Qi reservoir', detail: `+${meta.qiCap} max Qi`, remainingMs: null });
  if (meta.stones) views.push({ source: 'Spirit Card', name: 'Stone gathering', detail: `+${meta.stones} spirit stones / hour`, remainingMs: null });
  return views;
}

function sectBuffViews(player) {
  const b = guildBuffs(player);
  const views = [];
  if (b.xpPct) views.push({ source: 'Sect', name: 'War disciples', detail: `+${Math.round(b.xpPct * 100)}% battle XP`, remainingMs: null });
  if (b.stonePct) views.push({ source: 'Sect', name: 'Merchant disciples', detail: `+${Math.round(b.stonePct * 100)}% battle spirit stones`, remainingMs: null });
  if (b.stonesPerHour) views.push({ source: 'Sect', name: 'Alchemy disciples', detail: `+${b.stonesPerHour} spirit stones / hour`, remainingMs: null });
  if (b.qiCap) views.push({ source: 'Sect', name: 'Meditation disciples', detail: `+${b.qiCap} max Qi`, remainingMs: null });
  return views;
}

function allBuffViews(player, now) {
  return [...techniqueBuffViews(player, now), ...cardBuffViews(player), ...sectBuffViews(player)];
}

// --- "Recently Active" feed. A rotating, deterministic slice of the persona
// roster made to look like other cultivators going about their lives. It uses
// the project's wall-clock pattern: the feed is seeded from a coarse time
// bucket, so it's stable for a few minutes then refreshes on its own — no
// persistence, identical for anyone at the same wall-clock moment, and it drifts
// like a real activity feed rather than freezing. Personas near the player's
// level are favored (FS "recently-online players at your level" is both social
// texture and PvP scouting, GDD §6.5). ---

const FEED_BUCKET_MS = 3 * 60 * 1000; // refresh cadence — matches the Pavilion's ~3-min rotation feel
const FEED_SIZE = 8;

const ACTIONS = [
  { verb: 'slew a demonic beast in', kind: 'zone' },
  { verb: 'looted a rare artifact in', kind: 'zone' },
  { verb: 'listed an artifact at the Treasure Pavilion', kind: 'plain' },
  { verb: 'broke through to', kind: 'stage' },
  { verb: 'channelled a forbidden technique', kind: 'plain' },
  { verb: 'recruited a fellow disciple', kind: 'plain' },
  { verb: 'refined a batch of spirit pills', kind: 'plain' },
  { verb: 'won a duel over spirit stones', kind: 'plain' },
];

const ZONES_FLAVOR = ['Azuremist Vale', 'Cindervein Gorge'];

function activityLine(persona, rng) {
  const act = ACTIONS[Math.floor(rng() * ACTIONS.length)];
  if (act.kind === 'zone') return `${act.verb} ${ZONES_FLAVOR[Math.floor(rng() * ZONES_FLAVOR.length)]}`;
  if (act.kind === 'stage') {
    const lvl = Math.max(2, persona.level + (Math.floor(rng() * 3) - 1)); // ~their level
    return `${act.verb} ${stageName(lvl)}`;
  }
  return act.verb;
}

function recentlyActive(player, now) {
  const bucket = Math.floor(now / FEED_BUCKET_MS);
  const rng = mulberry32((bucket ^ 0x9e37_79b9) >>> 0);
  // Weight personas near the player's level so the feed reads as "peers".
  const lvl = player.level;
  const weighted = PERSONAS.map((p) => ({ p, w: rng() + 2 / (1 + Math.abs(p.level - lvl)) }))
    .sort((a, b) => b.w - a.w)
    .slice(0, FEED_SIZE)
    .map((x) => x.p);
  return weighted.map((p) => {
    // A stable-within-bucket "minutes ago" and action, seeded per persona+bucket.
    const r = mulberry32(((bucket * 73856093) ^ personaIndex(p) * 19349663) >>> 0);
    const minutesAgo = 1 + Math.floor(r() * 58);
    return {
      persona: p,
      label: personaLabel(p),
      minutesAgo,
      activity: activityLine(p, r),
      isRival: isRival(player, p.id),
    };
  }).sort((a, b) => a.minutesAgo - b.minutesAgo);
}

function personaIndex(persona) {
  return parseInt(persona.id.split('-')[1], 10) || 0;
}

// Candidate rivals to add: personas near the player's level, not already rivals,
// ordered by closeness. Gives the "add anyone" list a sensible default cast.
function rivalCandidates(player) {
  const lvl = player.level;
  return PERSONAS
    .filter((p) => !isRival(player, p.id))
    .map((p) => ({ p, d: Math.abs(p.level - lvl) }))
    .sort((a, b) => a.d - b.d || personaIndex(a.p) - personaIndex(b.p))
    .slice(0, 12)
    .map((x) => x.p);
}

// The ProfileProvider interface (GDD §6.5). NPC-backed today; a 2.0 network
// impl fills the same shape from real players.
export function createProfileProvider(state) {
  return {
    summary: (now = Date.now()) => {
      const p = state.player;
      const eff = effectiveStats(p, now);
      const { realm, sub } = realmFor(p.level);
      return {
        name: p.name,
        realm,
        sub,
        stage: stageName(p.level),
        level: p.level,
        spiritStones: p.spiritStones,
        cards: ownedCardCount(p),
        disciples: p.guild?.members?.length ?? 0,
        rivals: rivalIds(p).length,
        stats: eff,
      };
    },
    buffs: (now = Date.now()) => allBuffViews(state.player, now),
    rivals: () => rivalIds(state.player).map((id) => personaById(id)).filter(Boolean),
    rivalCandidates: () => rivalCandidates(state.player),
    isRival: (id) => isRival(state.player, id),
    addRival: (id) => addRival(state, id),
    removeRival: (id) => removeRival(state, id),
    recentlyActive: (now = Date.now()) => recentlyActive(state.player, now),
  };
}

// =====================================================================
// Rendering — owned here (not ui.js) to stay out of parallel shared-file edits.
// =====================================================================

let provider = null;
let showRivalPicker = false;
// Optional "Spar" handler injected by the game layer (Sparring / PvP-preview,
// task D). Kept as an injected callback rather than a direct import so profile.js
// stays free of a duel.js dependency (no module cycle).
let onSpar = null;
export function setSparHandler(fn) { onSpar = fn; }

function fmtAgo(min) {
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  return `${h}h ${min % 60}m ago`;
}

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

function renderSummary(s) {
  const box = $('profile-summary');
  box.title = 'Your cultivation summary — effective combat stats after gear, cards, meridians, sect buffs and techniques.';
  const stat = (k, label) => `<span class="prof-stat"><span class="prof-stat-label">${label}</span> ${s.stats[k]}</span>`;
  box.innerHTML = `
    <div class="prof-identity">
      <span class="prof-name">${s.name}</span>
      <span class="prof-realm">${s.stage}</span>
    </div>
    <div class="prof-stat-grid">
      ${stat('attack', 'ATK')}${stat('defense', 'DEF')}
      ${stat('damage', 'DMG')}${stat('armor', 'ARM')}
      <span class="prof-stat"><span class="prof-stat-label">HP</span> ${s.stats.maxHp}</span>
      <span class="prof-stat"><span class="prof-stat-label">Stones</span> ${s.spiritStones} ◆</span>
    </div>
    <div class="prof-meta dim">
      Spirit Cards: ${s.cards} · Disciples: ${s.disciples} · Rivals: ${s.rivals}
    </div>`;
}

function renderBuffs(buffs, now) {
  const box = $('profile-buffs');
  box.innerHTML = '';
  if (buffs.length === 0) {
    box.appendChild(el('p', 'empty-note', 'No active buffs. Channel a technique, own Spirit Cards, or recruit disciples to see them here.'));
    return;
  }
  for (const b of buffs) {
    const row = el('div', 'prof-buff-row');
    const time = b.remainingMs == null
      ? '<span class="prof-buff-perm">always on</span>'
      : `<span class="prof-buff-time">${Math.ceil(b.remainingMs / 1000)}s</span>`;
    row.title = b.remainingMs == null
      ? `${b.name} (${b.source}) — an always-on bonus: ${b.detail}.`
      : `${b.name} (${b.source}) — ${b.detail}, fades in ${Math.ceil(b.remainingMs / 1000)}s.`;
    row.innerHTML = `
      <span class="prof-buff-src src-${b.source.toLowerCase().replace(/\s+/g, '')}">${b.source}</span>
      <span class="prof-buff-name">${b.name}</span>
      <span class="prof-buff-eff dim">${b.detail}</span>
      ${time}`;
    box.appendChild(row);
  }
}

function renderRivals() {
  const box = $('profile-rivals');
  box.innerHTML = '';
  const rivals = provider.rivals();
  if (rivals.length === 0) {
    box.appendChild(el('p', 'empty-note', 'No rivals marked. Track cultivators from the feed below or add one.'));
  }
  for (const r of rivals) {
    const row = el('div', 'prof-social-row');
    row.appendChild(el('span', 'prof-social-name', personaLabelSafe(r)));
    if (onSpar) {
      const spar = el('button', 'claim-btn prof-mini-btn', 'Spar');
      spar.title = 'Spar this rival — a friendly duel through the combat resolver';
      spar.addEventListener('click', () => onSpar(r.id));
      row.appendChild(spar);
    }
    const btn = el('button', 'danger-btn prof-mini-btn', 'Unmark');
    btn.title = `Stop tracking ${personaLabelSafe(r)} as a rival.`;
    btn.addEventListener('click', () => { provider.removeRival(r.id); refresh(); });
    row.appendChild(btn);
    box.appendChild(row);
  }

  const toggle = $('profile-add-rival');
  toggle.textContent = showRivalPicker ? 'Close' : '+ Add rival';
  toggle.title = showRivalPicker ? 'Close the rival picker.' : 'Pick a cultivator to track as a rival — lets you spar them and see them flagged in the feed.';

  const picker = $('profile-rival-picker');
  picker.innerHTML = '';
  picker.classList.toggle('hidden', !showRivalPicker);
  if (showRivalPicker) {
    for (const p of provider.rivalCandidates()) {
      const row = el('div', 'prof-social-row');
      row.appendChild(el('span', 'prof-social-name', personaLabelSafe(p)));
      const btn = el('button', 'claim-btn prof-mini-btn', 'Mark rival');
      btn.title = `Track ${personaLabelSafe(p)} as a rival — lets you spar them and see them flagged in the feed.`;
      btn.addEventListener('click', () => { provider.addRival(p.id); showRivalPicker = false; refresh(); });
      row.appendChild(btn);
      picker.appendChild(row);
    }
  }
}

function personaLabelSafe(p) {
  return personaLabel(p);
}

function renderFeed(now) {
  const box = $('profile-feed');
  box.innerHTML = '';
  for (const f of provider.recentlyActive(now)) {
    const row = el('div', 'prof-feed-row');
    const rivalMark = f.isRival ? '<span class="prof-rival-mark" title="Rival">⚑</span> ' : '';
    row.title = `${f.label} ${f.activity}, ${fmtAgo(f.minutesAgo)}. A simulated fellow cultivator — not another real player yet.`;
    row.innerHTML = `
      <span class="prof-feed-dot"></span>
      <span class="prof-feed-text">${rivalMark}<span class="prof-feed-name">${f.label}</span> ${f.activity}</span>
      <span class="prof-feed-time dim">${fmtAgo(f.minutesAgo)}</span>`;
    box.appendChild(row);
  }
}

function refresh(now = Date.now()) {
  if (!provider) return;
  renderSummary(provider.summary(now));
  renderBuffs(provider.buffs(now), now);
  renderRivals();
  renderFeed(now);
}

export function renderProfile(state, now = Date.now()) {
  if (!provider) provider = createProfileProvider(state);
  refresh(now);
}

export function initProfile(state) {
  provider = createProfileProvider(state);
  const overlay = $('profile-overlay');
  $('btn-profile').addEventListener('click', () => {
    showRivalPicker = false;
    renderProfile(state);
    overlay.classList.remove('hidden');
  });
  $('btn-close-profile').addEventListener('click', () => overlay.classList.add('hidden'));
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.add('hidden');
  });
  $('profile-add-rival').addEventListener('click', () => {
    showRivalPicker = !showRivalPicker;
    renderRivals();
  });
}
