// Combat Sets / loadouts (GDD §6.2). Save the currently-equipped artifacts as a
// named set and swap between sets in one click — e.g. a leveling set vs a
// defensive boss set — without re-equipping each piece by hand. A small feature
// with real tactical depth, and cheap because it's just a named list of item ids
// applied through the existing equip/unequip logic.
//
// Kept self-contained to stay parallel-work-safe: this module owns both the data
// ops and its own view (a "Combat Sets" panel inserted after the gear box), so
// it needs no markup in index.html and never touches ui.js. Sets live on
// `player.loadouts`, so they persist with the save wholesale (no save.js edit).

import { equipItem, unequipItem } from './items.js';

export const MAX_LOADOUTS = 4;

// Effective loadout cap: base plus the Hall of Merit "Combat Set Expansion"
// upgrade (+1 slot per purchase, Wave 3 Economy). Reads meritShop purchases
// directly (no meritshop.js import needed).
export function effectiveMaxLoadouts(player) {
  return MAX_LOADOUTS + (player?.meritShop?.purchases?.loadoutSlots ?? 0);
}

// Resolve an item id to the live item object (equipped or in the pack), or null.
function itemById(player, id) {
  if (!id) return null;
  for (const it of Object.values(player.equipment)) if (it && it.id === id) return it;
  return player.inventory.find((i) => i.id === id) ?? null;
}

// Snapshot the currently-equipped artifacts as a named set. Re-saving a name
// overwrites it. Returns { ok, set } or { ok:false, reason }.
export function saveLoadout(player, rawName) {
  if (!player.loadouts) player.loadouts = [];
  const name = (rawName || '').trim() || `Set ${player.loadouts.length + 1}`;
  const set = {
    name,
    weapon: player.equipment.weapon?.id ?? null,
    robe: player.equipment.robe?.id ?? null,
    weaponName: player.equipment.weapon?.name ?? null,
    robeName: player.equipment.robe?.name ?? null,
  };
  const existing = player.loadouts.findIndex((l) => l.name.toLowerCase() === name.toLowerCase());
  if (existing >= 0) {
    player.loadouts[existing] = set;
    return { ok: true, set, overwrote: true };
  }
  const cap = effectiveMaxLoadouts(player);
  if (player.loadouts.length >= cap) {
    return { ok: false, reason: `You can keep at most ${cap} combat sets.` };
  }
  player.loadouts.push(set);
  return { ok: true, set };
}

// Equip the artifacts in a set. Items that were sold/destroyed since are skipped
// and reported. Returns { ok, missing: [names] }.
export function applyLoadout(player, index) {
  const set = player.loadouts?.[index];
  if (!set) return { ok: false, reason: 'No such set.' };
  const missing = [];
  for (const slot of ['weapon', 'robe']) {
    const wantId = set[slot];
    if (!wantId) {
      // The set had this slot empty — bare it (best-effort; a full pack blocks it).
      if (player.equipment[slot]) unequipItem(player, slot);
      continue;
    }
    if (player.equipment[slot]?.id === wantId) continue; // already worn
    if (player.inventory.some((i) => i.id === wantId)) {
      equipItem(player, wantId); // swaps the current piece back into the pack
    } else {
      missing.push(set[`${slot}Name`] || wantId);
    }
  }
  return { ok: true, missing };
}

export function deleteLoadout(player, index) {
  if (!player.loadouts?.[index]) return { ok: false };
  const [removed] = player.loadouts.splice(index, 1);
  return { ok: true, removed };
}

// --- Self-contained view: a "Combat Sets" panel-box placed after the gear box. ---

const $ = (id) => document.getElementById(id);
const SLOT_ICON = { weapon: '⚔️', robe: '👘' };

let container = null;
let refs = null; // { state, actions }

function setSummary(player, set) {
  return ['weapon', 'robe']
    .map((slot) => {
      const id = set[slot];
      if (!id) return `${SLOT_ICON[slot]} —`;
      const item = itemById(player, id);
      return item ? `${SLOT_ICON[slot]} <span class="rarity-${item.rarity}">${item.name}</span>` : `${SLOT_ICON[slot]} <span class="ld-missing">(lost)</span>`;
    })
    .join(' · ');
}

export function renderLoadouts(state) {
  if (!container) return;
  const p = state.player;
  const sets = p.loadouts ?? [];
  container.innerHTML = '<h3>Combat Sets</h3>';

  const bar = document.createElement('div');
  bar.className = 'ld-savebar';
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'ld-name';
  input.placeholder = 'Name this set…';
  input.maxLength = 24;
  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'ld-save-btn';
  saveBtn.textContent = 'Save worn gear';
  const cap = effectiveMaxLoadouts(p);
  saveBtn.disabled = sets.length >= cap;
  if (saveBtn.disabled) saveBtn.title = `Max ${cap} sets — delete one first`;
  saveBtn.addEventListener('click', () => {
    refs.actions.save(input.value);
    input.value = '';
  });
  bar.append(input, saveBtn);
  container.appendChild(bar);

  if (sets.length === 0) {
    const note = document.createElement('p');
    note.className = 'empty-note';
    note.textContent = 'Equip a loadout, then save it here to swap gear in one click.';
    container.appendChild(note);
    return;
  }

  const list = document.createElement('div');
  list.className = 'ld-list';
  sets.forEach((set, i) => {
    const row = document.createElement('div');
    row.className = 'ld-row';
    const info = document.createElement('div');
    info.className = 'ld-info';
    info.innerHTML = `<div class="ld-set-name">${set.name}</div><div class="ld-set-gear dim">${setSummary(p, set)}</div>`;
    const apply = document.createElement('button');
    apply.type = 'button';
    apply.className = 'ld-apply-btn';
    apply.textContent = 'Equip';
    apply.addEventListener('click', () => refs.actions.apply(i));
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'danger-btn';
    del.textContent = '✕';
    del.title = 'Delete set';
    del.addEventListener('click', () => refs.actions.remove(i));
    row.append(info, apply, del);
    list.appendChild(row);
  });
  container.appendChild(list);
}

export function initLoadouts(state, actions) {
  refs = { state, actions };
  container = document.createElement('div');
  container.id = 'loadouts-box';
  container.className = 'panel-box';
  const gearBox = $('gear-box');
  if (gearBox && gearBox.parentNode) gearBox.after(container); // sit right below Artifacts
  else document.getElementById('char-panel')?.appendChild(container);
  renderLoadouts(state);
}
