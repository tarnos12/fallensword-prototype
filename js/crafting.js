// Crafting & Forge (GDD §5). Spend spirit stones at the ⚒ Forge to improve gear
// three ways: **Reforge** (reroll an artifact's stat values within its rarity/
// level — chase a better spread), **Temper** (raise its level, scaling stats up),
// and **Repair** (restore durability from anywhere, not just a haven).
//
// Kept self-contained to stay parallel-work-safe (the same discipline as
// loadouts.js / tutorial.js): this module owns its own ⚒ button (injected into
// the existing nav menu) and its own modal DOM, so it needs no markup in
// index.html and never touches ui.js. The mechanical helpers live in items.js
// (additive) and the stone-spending wrappers in game.js; this file is the view.
// Nothing new is persisted — the forge only mutates items already on `player`.

import {
  RARITIES,
  reforgeCost,
  upgradeCost,
  repairCost,
  canUpgradeItem,
  MAX_FORGE_LEVEL,
} from './items.js';

const $ = (id) => document.getElementById(id);
const SLOT_ICONS = { weapon: '⚔️', robe: '👘' };
const STAT_LABELS = { attack: 'Attack', defense: 'Defense', damage: 'Damage', armor: 'Armor', hp: 'Max HP' };

let overlay = null;
let forge = null; // { state, actions }

// Every artifact the player holds — worn first, then the pack — tagged with where
// it sits so the row can label it.
function ownedItems(player) {
  const worn = Object.entries(player.equipment)
    .filter(([, it]) => it)
    .map(([slot, it]) => ({ item: it, where: `equipped ${slot}` }));
  const packed = player.inventory.map((it) => ({ item: it, where: 'pack' }));
  return [...worn, ...packed];
}

function statLine(item) {
  return Object.entries(item.bonuses)
    .map(([s, v]) => `+${v} ${STAT_LABELS[s] ?? s}`)
    .join(' · ');
}

function forgeRow(entry) {
  const { state, actions } = forge;
  const { item, where } = entry;
  const stones = state.player.spiritStones;

  const row = document.createElement('div');
  row.className = 'forge-row';

  const icon = document.createElement('div');
  icon.className = `item-slot forge-icon icon-${item.rarity}`;
  icon.innerHTML = `<span class="item-icon">${SLOT_ICONS[item.slot]}</span>`;

  const info = document.createElement('div');
  info.className = 'forge-info';
  const dur = item.durability < item.maxDurability
    ? ` · <span class="${item.durability <= 0 ? 'broken' : 'dim'}">dur ${item.durability}/${item.maxDurability}</span>`
    : '';
  info.innerHTML = `<div class="forge-name rarity-${item.rarity}">${item.name}
      <span class="dim">Lv ${item.level} ${RARITIES[item.rarity].label} ${item.slot}</span></div>
    <div class="forge-stats dim">${statLine(item)}</div>
    <div class="forge-where dim">${where}${dur}</div>`;

  const actionsWrap = document.createElement('div');
  actionsWrap.className = 'forge-actions';

  // Reforge — reroll stat values.
  const rfCost = reforgeCost(item);
  const reforge = document.createElement('button');
  reforge.type = 'button';
  reforge.className = 'forge-btn';
  reforge.textContent = `Reforge · ${rfCost} ◆`;
  reforge.title = 'Reroll this artifact’s stat values within its rarity';
  reforge.disabled = stones < rfCost;
  reforge.addEventListener('click', () => { actions.reforge(item.id); rerender(); });
  actionsWrap.appendChild(reforge);

  // Temper — raise item level, scaling stats up.
  const temper = document.createElement('button');
  temper.type = 'button';
  temper.className = 'forge-btn temper';
  if (canUpgradeItem(item)) {
    const upCost = upgradeCost(item);
    temper.textContent = `Temper → Lv ${item.level + 1} · ${upCost} ◆`;
    temper.title = 'Raise this artifact’s level, scaling every stat up';
    temper.disabled = stones < upCost;
    temper.addEventListener('click', () => { actions.upgrade(item.id); rerender(); });
  } else {
    temper.textContent = `Peak (Lv ${MAX_FORGE_LEVEL})`;
    temper.disabled = true;
  }
  actionsWrap.appendChild(temper);

  // Repair — only when worn/damaged.
  const rpCost = repairCost(item);
  if (rpCost > 0) {
    const repair = document.createElement('button');
    repair.type = 'button';
    repair.className = 'forge-btn';
    repair.textContent = `Repair · ${rpCost} ◆`;
    repair.disabled = stones < rpCost;
    repair.addEventListener('click', () => { actions.repair(item.id); rerender(); });
    actionsWrap.appendChild(repair);
  }

  row.append(icon, info, actionsWrap);
  return row;
}

export function renderForge(state) {
  if (!overlay) return;
  $('forge-stones').textContent = `— ◆ ${state.player.spiritStones}`;
  const body = $('forge-body');
  body.innerHTML = '';

  const intro = document.createElement('p');
  intro.className = 'empty-note';
  intro.textContent = 'Spend spirit stones to refine your artifacts. Reforge rerolls its stats, Temper raises its level, Repair restores durability.';
  body.appendChild(intro);

  const items = ownedItems(state.player);
  if (items.length === 0) {
    const none = document.createElement('p');
    none.className = 'empty-note';
    none.textContent = 'You hold no artifacts to forge. Slay beasts or visit the Pavilion first.';
    body.appendChild(none);
    return;
  }
  const list = document.createElement('div');
  list.className = 'forge-list';
  for (const entry of items) list.appendChild(forgeRow(entry));
  body.appendChild(list);
}

// Re-render the modal after a forge action (the action already refreshed the HUD
// via renderAll in main.js).
function rerender() {
  renderForge(forge.state);
}

export function initForge(state, actions) {
  forge = { state, actions };

  // Own ⚒ button, dropped into the existing nav-menu grid (no index.html edit).
  const btn = document.createElement('button');
  btn.id = 'btn-forge';
  btn.type = 'button';
  btn.className = 'forge-nav-btn';
  btn.title = 'The Forge — reforge, temper & repair your artifacts';
  btn.textContent = '⚒ Forge';
  ($('nav-menu') ?? document.getElementById('char-panel'))?.appendChild(btn);

  // Own modal DOM.
  overlay = document.createElement('div');
  overlay.id = 'forge-overlay';
  overlay.className = 'hidden';
  overlay.innerHTML = `
    <div id="forge-panel">
      <div id="forge-header">
        <h2>The Forge <span id="forge-stones" class="dim"></span></h2>
        <button id="btn-close-forge" type="button" title="Close">✕</button>
      </div>
      <div id="forge-body"></div>
    </div>`;
  document.body.appendChild(overlay);

  const open = () => { renderForge(state); overlay.classList.remove('hidden'); };
  const close = () => overlay.classList.add('hidden');
  btn.addEventListener('click', open);
  $('btn-close-forge').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
}
