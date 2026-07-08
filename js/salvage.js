// Salvage / materials (board task M, GDD §5). Right-click "Salvage" breaks an
// unwanted artifact (or loose gem) down into stackable **spirit essence** — one
// essence tier per rarity. Essence is then an interim sink: spend it to **mend
// gear** (restore durability from anywhere) at a cost that feels cheaper than the
// stone-based forge/haven repair, until full crafting consumes materials.
//
// Self-contained like js/crafting.js: this module owns the material catalog, the
// pure yield/cost helpers, the ♻ Salvage modal (own button injected into
// #nav-menu, own modal DOM), and its own stylesheet (css/salvage.css, linked in
// index.html). The stateful mutation (removing the item, crediting/spending
// essence, logging, saving) lives in thin game.js wrappers; this file is the
// view + the pure math. Imports are one-directional (items.js only), so no cycle.

import { RARITIES, repairCost } from './items.js';

// One essence tier per rarity (keyed by the item's rarity). Higher-rarity gear
// yields — and repairs with — its own richer essence, so tiers don't fungibly
// mix (mending an epic wants epic essence, salvaged from epic gear).
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
// Works uniformly for gear AND loose gems (both carry rarity + level).
export function salvageYield(item) {
  const rarity = RARITIES[item?.rarity];
  const mat = MATERIALS[item?.rarity];
  if (!rarity || !mat) return null;
  const qty = 1 + Math.floor((item.level ?? 1) / 2) + (rarity.attributes - 1);
  return { materialId: mat.id, qty };
}

// PURE: the essence cost to fully mend an item's durability. Deliberately cheaper
// -feeling than the stone repairCost baseline (a few essence vs dozens of stones)
// and paid in the item's own rarity tier. { materialId, qty } — qty 0 when full.
export function essenceRepairCost(item) {
  const mat = MATERIALS[item?.rarity];
  if (!mat) return null;
  const missing = (item.maxDurability ?? 0) - (item.durability ?? 0);
  if (missing <= 0) return { materialId: mat.id, qty: 0 };
  const qty = Math.max(1, Math.ceil(missing / 15));
  return { materialId: mat.id, qty };
}

// --- Modal (view only; actions are injected callbacks wired to game.js) ---

const $ = (id) => document.getElementById(id);
const STAT_LABELS = { attack: 'Attack', defense: 'Defense', damage: 'Damage', armor: 'Armor', hp: 'Max HP' };
const SLOT_ICONS = { weapon: '⚔️', robe: '👘' };

let overlay = null;
let salvage = null; // { state, actions }

// Every artifact the player holds that has durability to mend — worn first, then
// pack — tagged with where it sits. Gems (no durability) are skipped for mending.
function damageableItems(player) {
  const worn = Object.entries(player.equipment)
    .filter(([, it]) => it && it.maxDurability != null)
    .map(([slot, it]) => ({ item: it, where: `equipped ${slot}` }));
  const packed = player.inventory
    .filter((it) => it && it.maxDurability != null && it.slot)
    .map((it) => ({ item: it, where: 'pack' }));
  return [...worn, ...packed];
}

function ledgerRow(mat, qty) {
  const row = document.createElement('div');
  row.className = `salvage-mat rarity-${mat.rarity}`;
  row.innerHTML = `<span class="salvage-mat-icon">${mat.icon}</span>
    <span class="salvage-mat-name">${mat.name}</span>
    <span class="salvage-mat-qty">${qty}</span>`;
  return row;
}

function mendRow(entry) {
  const { state, actions } = salvage;
  const { item, where } = entry;
  const mats = state.player.materials || {};
  const cost = essenceRepairCost(item);

  const row = document.createElement('div');
  row.className = 'salvage-row';

  const icon = document.createElement('div');
  icon.className = `item-slot salvage-icon icon-${item.rarity}`;
  icon.innerHTML = `<span class="item-icon">${SLOT_ICONS[item.slot] ?? '◈'}</span>`;

  const info = document.createElement('div');
  info.className = 'salvage-info';
  const broken = item.durability <= 0;
  info.innerHTML = `<div class="salvage-name rarity-${item.rarity}">${item.name}
      <span class="dim">Lv ${item.level} ${RARITIES[item.rarity].label} ${item.slot}</span></div>
    <div class="salvage-dur ${broken ? 'broken' : 'dim'}">durability ${item.durability}/${item.maxDurability}</div>
    <div class="salvage-where dim">${where}</div>`;

  const actionsWrap = document.createElement('div');
  actionsWrap.className = 'salvage-actions';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'salvage-btn';
  const mat = MATERIAL_BY_ID[cost.materialId];
  const have = mats[cost.materialId] || 0;
  btn.textContent = `Mend · ${cost.qty} ${mat.icon}`;
  btn.title = `Restore durability for ${cost.qty} ${mat.name} (have ${have})`;
  btn.disabled = have < cost.qty;
  btn.addEventListener('click', () => { actions.repair(item.id); rerender(); });
  actionsWrap.appendChild(btn);

  row.append(icon, info, actionsWrap);
  return row;
}

export function renderSalvage(state) {
  if (!overlay) return;
  const p = state.player;
  const mats = p.materials || {};

  // Essence ledger.
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

  // Mend-gear list.
  const body = $('salvage-mend');
  body.innerHTML = '';
  const items = damageableItems(p).filter((e) => e.item.durability < e.item.maxDurability);
  if (items.length === 0) {
    const none = document.createElement('p');
    none.className = 'empty-note';
    none.textContent = 'All your artifacts are at full durability.';
    body.appendChild(none);
    return;
  }
  const list = document.createElement('div');
  list.className = 'salvage-list';
  for (const entry of items) list.appendChild(mendRow(entry));
  body.appendChild(list);
}

function rerender() {
  renderSalvage(salvage.state);
}

export function initSalvage(state, actions) {
  salvage = { state, actions };

  // Own ♻ button, dropped into the existing nav-menu grid (no index.html edit).
  const btn = document.createElement('button');
  btn.id = 'btn-salvage';
  btn.type = 'button';
  btn.className = 'salvage-nav-btn';
  btn.title = 'Salvage — break gear into spirit essence & mend with it';
  btn.textContent = '♻ Salvage';
  ($('nav-menu') ?? document.getElementById('char-panel'))?.appendChild(btn);

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
      <p class="salvage-intro">Break unwanted artifacts into spirit essence (right-click gear in your pack → Salvage), then spend essence to mend your gear anywhere — cheaper than a stone repair.</p>
      <h3 class="salvage-subhead">Spirit Essence</h3>
      <div id="salvage-ledger"></div>
      <h3 class="salvage-subhead">Mend Gear with Essence</h3>
      <div id="salvage-mend"></div>
    </div>`;
  document.body.appendChild(overlay);

  const open = () => { renderSalvage(state); overlay.classList.remove('hidden'); };
  const close = () => overlay.classList.add('hidden');
  btn.addEventListener('click', open);
  $('btn-close-salvage').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
}
