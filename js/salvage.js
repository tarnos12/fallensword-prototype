// Salvage / materials (board task M, GDD §5). Right-click "Salvage" breaks an
// unwanted artifact down into stackable **spirit essence** — one essence tier
// per rarity — as a recycle sink for gear you don't want to sell. The Salvage
// Workbench is a ledger of the essence you've accumulated (a crafting material
// for future use; durability/mending was removed).
//
// Self-contained like js/crafting.js: this module owns the material catalog, the
// pure yield helper, the ♻ Salvage modal (own button injected into the equipment
// menu, own modal DOM), and its own stylesheet (css/salvage.css, linked in
// index.html). The stateful mutation (removing the item, crediting essence,
// logging, saving) lives in a thin game.js wrapper; this file is the view + the
// pure math. Imports are one-directional (items.js only), so no cycle.

import { RARITIES } from './items.js';

// One essence tier per rarity (keyed by the item's rarity). Higher-rarity gear
// yields its own richer essence, so tiers don't fungibly mix.
export const MATERIALS = {
  common: { id: 'essence_common', name: 'Murky Spirit Dust', rarity: 'common', icon: '·' },
  uncommon: { id: 'essence_uncommon', name: 'Clear Spirit Essence', rarity: 'uncommon', icon: '◦' },
  rare: { id: 'essence_rare', name: 'Refined Spirit Essence', rarity: 'rare', icon: '◈' },
  epic: { id: 'essence_epic', name: 'Verdant Spirit Essence', rarity: 'epic', icon: '❉' },
  legendary: { id: 'essence_legendary', name: 'Celestial Spirit Essence', rarity: 'legendary', icon: '✦' },
  mythic: { id: 'essence_mythic', name: 'Primordial Spirit Essence', rarity: 'mythic', icon: '❈' },
};

// materialId -> catalog entry (for name/icon lookup by ledger key).
export const MATERIAL_BY_ID = Object.fromEntries(
  Object.values(MATERIALS).map((m) => [m.id, m])
);

// Ordered by rarity tier so the ledger reads low→high.
export const MATERIAL_LIST = Object.keys(RARITIES)
  .map((r) => MATERIALS[r])
  .filter(Boolean);

export function materialName(materialId) {
  return MATERIAL_BY_ID[materialId]?.name ?? materialId;
}

// PURE: an item's salvage yield — its rarity picks the essence tier, and the
// amount scales with level + rarity depth (a richer piece breaks into more).
export function salvageYield(item) {
  const rarity = RARITIES[item?.rarity];
  const mat = MATERIALS[item?.rarity];
  if (!rarity || !mat) return null;
  const qty = 1 + Math.floor((item.level ?? 1) / 2) + (rarity.attributes - 1);
  return { materialId: mat.id, qty };
}

// --- Modal (view only; the essence ledger) ---

const $ = (id) => document.getElementById(id);

let overlay = null;
let salvage = null; // { state, actions }

function ledgerRow(mat, qty) {
  const row = document.createElement('div');
  row.className = `salvage-mat rarity-${mat.rarity}`;
  row.title = `${mat.name} — ${RARITIES[mat.rarity]?.label ?? mat.rarity} salvage essence. You have ${qty}.`;
  row.innerHTML = `<span class="salvage-mat-icon">${mat.icon}</span>
    <span class="salvage-mat-name">${mat.name}</span>
    <span class="salvage-mat-qty">${qty}</span>`;
  return row;
}

export function renderSalvage(state) {
  if (!overlay) return;
  const mats = state.player.materials || {};

  const ledger = $('salvage-ledger');
  ledger.innerHTML = '';
  const owned = MATERIAL_LIST.filter((m) => (mats[m.id] || 0) > 0);
  if (owned.length === 0) {
    const none = document.createElement('p');
    none.className = 'empty-note';
    none.textContent = 'No spirit essence yet. Right-click an artifact in your pack and choose Salvage to break it down.';
    ledger.appendChild(none);
  } else {
    for (const m of owned) ledger.appendChild(ledgerRow(m, mats[m.id]));
  }
}

export function initSalvage(state, actions) {
  salvage = { state, actions };

  // Own ♻ button, dropped into the existing equipment menu (no index.html edit).
  const btn = document.createElement('button');
  btn.id = 'btn-salvage';
  btn.type = 'button';
  btn.className = 'salvage-nav-btn';
  btn.title = 'Salvage — break unwanted gear into spirit essence';
  btn.innerHTML = '<span class="gi gi-shard" aria-hidden="true"></span> Salvage';
  ($('equipment-menu') ?? document.getElementById('equip-panel'))?.appendChild(btn);

  // Own modal DOM.
  overlay = document.createElement('div');
  overlay.id = 'salvage-overlay';
  overlay.className = 'hidden';
  overlay.innerHTML = `
    <div id="salvage-panel">
      <div id="salvage-header">
        <h2>Salvage Workbench</h2>
        <button id="btn-close-salvage" type="button" title="Close">✕</button>
      </div>
      <p class="salvage-intro">Break unwanted artifacts into spirit essence — right-click gear in your pack and choose Salvage. Essence is a crafting material you accumulate here.</p>
      <h3 class="salvage-subhead">Spirit Essence</h3>
      <div id="salvage-ledger"></div>
    </div>`;
  document.body.appendChild(overlay);

  const open = () => { renderSalvage(state); overlay.classList.remove('hidden'); };
  const close = () => overlay.classList.add('hidden');
  btn.addEventListener('click', open);
  $('btn-close-salvage').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
}
