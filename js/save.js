// Save/load (GDD §4.4): local save is the only "account". Everything is
// plain JSON — the same blob could later be uploaded as server account state.
// Persisting lastQiTick is what makes offline wall-clock Qi regen work.

import { rehydrateMap } from './map.js';
import { getItemCounter, setItemCounter } from './items.js';
import { getCreatureCounter, setCreatureCounter } from './actors.js';

const KEY = 'fallen-immortal-save';
const VERSION = 1;

export function saveGame(state) {
  const blob = {
    version: VERSION,
    savedAt: Date.now(),
    player: state.player,
    pos: state.pos,
    qi: state.qi,
    lastQiTick: state.lastQiTick,
    quests: state.quests,
    tiles: state.map.tiles,
    log: state.log,
    counters: { item: getItemCounter(), creature: getCreatureCounter() },
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(blob));
  } catch (e) {
    console.error('Save failed:', e);
  }
}

// Returns a partial state to merge, or null if no (or incompatible) save.
export function loadGame() {
  let blob;
  try {
    blob = JSON.parse(localStorage.getItem(KEY));
  } catch {
    return null;
  }
  if (!blob || blob.version !== VERSION) return null;
  setItemCounter(blob.counters?.item ?? 1000);
  setCreatureCounter(blob.counters?.creature ?? 1000);
  return {
    player: blob.player,
    pos: blob.pos,
    qi: blob.qi,
    lastQiTick: blob.lastQiTick,
    quests: blob.quests,
    map: rehydrateMap(blob.tiles),
    log: blob.log ?? [],
    savedAt: blob.savedAt,
  };
}

export function clearSave() {
  localStorage.removeItem(KEY);
}
