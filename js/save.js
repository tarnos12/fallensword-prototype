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
    quests: blob.quests,
    zones,
    log: blob.log ?? [],
    savedAt: blob.savedAt,
  };
}

export function clearSave() {
  localStorage.removeItem(KEY);
}
