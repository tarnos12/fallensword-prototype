// Save/load (GDD §4.4): local save is the only "account". Everything is
// plain JSON — the same blob could later be uploaded as server account state.
// Persisting lastQiTick is what makes offline wall-clock Qi regen work.

import { ZONES, rehydrateZone } from './map.js';
import { getItemCounter, setItemCounter } from './items.js';
import { getCreatureCounter, setCreatureCounter } from './actors.js';

const KEY = 'fallen-immortal-save';
const VERSION = 2;

export function saveGame(state) {
  const zones = {};
  for (const [id, map] of Object.entries(state.zones)) zones[id] = map.tiles;
  const blob = {
    version: VERSION,
    savedAt: Date.now(),
    player: state.player,
    zoneId: state.zoneId,
    pos: state.pos,
    qi: state.qi,
    lastQiTick: state.lastQiTick,
    lastStoneTick: state.lastStoneTick,
    market: state.market,
    quests: state.quests,
    zones,
    log: state.log,
    counters: { item: getItemCounter(), creature: getCreatureCounter() },
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(blob));
  } catch (e) {
    console.error('Save failed:', e);
  }
}

// Returns a partial state to merge, or null if no save. createGame() fills in
// any zones not present here (new games, migrated saves, newly-added zones).
export function loadGame() {
  let blob;
  try {
    blob = JSON.parse(localStorage.getItem(KEY));
  } catch {
    return null;
  }
  if (!blob) return null;

  let zonesData;
  let zoneId;
  if (blob.version === 1) {
    // v1 stored a single zone's tiles under `tiles`; map it onto Azuremist.
    zonesData = { azuremist: blob.tiles };
    zoneId = 'azuremist';
  } else if (blob.version === 2) {
    zonesData = blob.zones ?? {};
    zoneId = blob.zoneId ?? 'azuremist';
  } else {
    return null; // unknown/newer format
  }

  setItemCounter(blob.counters?.item ?? 1000);
  setCreatureCounter(blob.counters?.creature ?? 1000);

  const zones = {};
  for (const [id, tiles] of Object.entries(zonesData)) {
    if (ZONES[id]) zones[id] = rehydrateZone(id, tiles);
  }

  return {
    player: blob.player,
    zoneId: ZONES[zoneId] ? zoneId : 'azuremist',
    pos: blob.pos,
    qi: blob.qi,
    lastQiTick: blob.lastQiTick,
    lastStoneTick: blob.lastStoneTick, // may be undefined on pre-card saves; createGame defaults it
    market: blob.market, // may be undefined on pre-Pavilion saves; createGame back-fills it
    quests: blob.quests,
    zones,
    log: blob.log ?? [],
    savedAt: blob.savedAt,
  };
}

export function clearSave() {
  localStorage.removeItem(KEY);
}

// --- Save export / import (GDD §4.4) -------------------------------------
// Back up / restore a save without an account. The exported string is the raw
// localStorage blob (the same JSON the game already persists), base64-wrapped
// behind a short marker so it survives copy-paste and we can sanity-check it on
// the way back in. Kept DOM-free: file download / clipboard lives in the caller.

const EXPORT_PREFIX = 'FIMMORTAL-SAVE-v1:'; // envelope version, independent of the save VERSION

// UTF-8-safe base64 (creature/persona names can be non-ASCII).
function b64encode(str) {
  return btoa(unescape(encodeURIComponent(str)));
}
function b64decode(b64) {
  return decodeURIComponent(escape(atob(b64)));
}

// Returns the current save as a portable string, or null if there's nothing to
// export. The wrapped payload is exactly what lives in localStorage.
export function exportSave() {
  let raw;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  return EXPORT_PREFIX + b64encode(raw);
}

// Validate + install an exported string into localStorage. Does NOT reload —
// the caller decides when to restart the game (createGame reads localStorage
// and runs the normal v1→v2 migration on next boot). Returns {ok} / {ok,error}.
export function importSave(input) {
  if (typeof input !== 'string') return { ok: false, error: 'No save string provided.' };
  let text = input.trim();
  if (!text) return { ok: false, error: 'No save string provided.' };

  // Accept a bare JSON blob too, but the wrapped form is what we hand out.
  let json;
  if (text.startsWith(EXPORT_PREFIX)) {
    try {
      json = b64decode(text.slice(EXPORT_PREFIX.length));
    } catch {
      return { ok: false, error: 'Save string is corrupted (bad encoding).' };
    }
  } else if (text.startsWith('{')) {
    json = text;
  } else {
    return { ok: false, error: 'Unrecognized save string.' };
  }

  let blob;
  try {
    blob = JSON.parse(json);
  } catch {
    return { ok: false, error: 'Save string is corrupted (not valid save data).' };
  }
  if (!blob || typeof blob !== 'object' || Array.isArray(blob)) {
    return { ok: false, error: 'Save string is not a valid save.' };
  }
  // Only versions loadGame() understands; newer/unknown formats are rejected
  // rather than silently written and then dropped on load.
  if (blob.version !== 1 && blob.version !== 2) {
    return { ok: false, error: `Unsupported save version (${blob.version ?? 'none'}).` };
  }
  if (!blob.player || typeof blob.player !== 'object') {
    return { ok: false, error: 'Save is missing player data.' };
  }

  try {
    localStorage.setItem(KEY, JSON.stringify(blob));
  } catch (e) {
    return { ok: false, error: 'Could not write save to this browser.' };
  }
  return { ok: true };
}
