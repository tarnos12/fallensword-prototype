// Profile page (UI-shell revamp) — a FallenSword-style character profile AND the
// equipment + stats hub. Rendered into #view-profile, NOT a modal. Two columns:
//   • Left  — a geometric Profile emblem, a Statistics panel (cultivation +
//              effective combat stats WITH stat-point allocation + currencies),
//              and an Enhancements panel (equipped set bonuses + opened meridians).
//   • Right — Equipment (a FallenSword-style paper-doll of framed slots, click to
//              unequip), Inventory (a 5-wide grid of pack items — click to equip,
//              right-click to sell/destroy), and Active Buffs.
//
// Interactivity is DI-injected: renderProfilePage(state, actions) receives
//   { onEquip(itemId), onUnequip(slot), onSell(itemId), onDestroy(itemId),
//     allocateStat(statKey) }
// so this view never imports the mutating game actions directly — the lead wires
// the real game.js actions in. Read-only over game state otherwise.

import { effectiveStats, stageName, realmFor, xpForBreakthrough, MAX_STAGE, ALLOC_STATS, POINT_VALUE } from './progression.js';
import { activeTitle } from './titles.js';
import { MERIDIAN_NODES } from './meridians.js';
import { SETS, equippedSetCount, setBonusAtCount } from './sets.js';
import { activeBuffs, get as getTech } from './techniques.js';
import { maxQi } from './game.js';
import { RARITIES, sellValue, effectiveInventorySize } from './items.js';
import { attachItemTooltip } from './ui.js';

const $ = (id) => document.getElementById(id);

// Paper-doll slots (§ equipment hub). The Items agent supplies templates for
// helm/gloves/boots/ring/amulet; this view renders all seven, empties dimmed.
const EQUIP_SLOTS = ['weapon', 'robe', 'helm', 'gloves', 'boots', 'ring', 'amulet'];
const SLOT_ICONS = {
  weapon: '⚔️', robe: '👘', helm: '🪖', gloves: '🧤', boots: '🥾', ring: '💍', amulet: '📿',
};
const SLOT_LABELS = {
  weapon: 'Weapon', robe: 'Robe', helm: 'Helm', gloves: 'Gloves', boots: 'Boots', ring: 'Ring', amulet: 'Amulet',
};

const STAT_LABELS = { attack: 'Attack', defense: 'Defense', damage: 'Damage', armor: 'Armor', hp: 'Max HP', maxHp: 'Max HP', qiRegen: 'Qi Regen' };

// Short "what does this do" hover copy for every player-facing stat.
const STAT_TIPS = {
  attack: 'Attack — raises your chance to land a hit.',
  defense: 'Defense — lowers the enemy\'s chance to hit you.',
  damage: 'Damage — how hard your hits land vs the enemy\'s armor and HP.',
  armor: 'Armor — reduces incoming damage.',
  hp: 'Max HP — how much punishment you can take.',
  maxHp: 'Max HP — how much punishment you can take.',
  qi: 'Qi — spent to move, fight, and cast; regenerates over time.',
  realm: 'Realm — your broad cultivation tier.',
  stage: 'Stage — your rank within the current realm.',
  level: 'Level — total stages cultivated.',
  breakthrough: 'Breakthrough — XP banked toward your next stage.',
  spiritStones: 'Spirit Stones — the common currency for forging and the market.',
  merit: 'Merit — earned from sect deeds; spent in the Hall of Merit.',
  ascension: 'Ascension — rebirth tier; each tier scales all stats.',
  kills: 'Total kills — foes you have slain across the world.',
};

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

function esc(s) {
  return String(s).replace(/"/g, '&quot;');
}

function totalKills(p) {
  return Object.values(p.bestiary ?? {}).reduce((s, e) => s + (e.kills || 0), 0);
}

// --- Shared item helpers (icon cell) --------------------------------------

// A framed clickable item cell (mirrors ui.js makeItemSlot behaviour). Returns a
// <button>; icon + rich hover card, with click / menu wiring.
function itemCell(item, { onClick, onMenu, hint, extraClass } = {}) {
  const btn = el('button', 'item-slot');
  btn.type = 'button';
  if (extraClass) btn.classList.add(extraClass);
  if (item) {
    btn.classList.add(`icon-${item.rarity}`);
    btn.innerHTML = `<span class="item-icon">${SLOT_ICONS[item.slot] ?? '◈'}</span>`;
    attachItemTooltip(btn, item, hint); // rich RPG hover card (not a plain title)
    if (onClick) btn.addEventListener('click', () => { closeContextMenu(); onClick(); });
    if (onMenu) btn.addEventListener('contextmenu', onMenu);
  } else {
    btn.classList.add('empty');
  }
  return btn;
}

// --- Lightweight right-click context menu (self-contained) ----------------

let ctxMenu = null;

function closeContextMenu() {
  if (ctxMenu) { ctxMenu.remove(); ctxMenu = null; }
}

function openContextMenu(e, entries) {
  e.preventDefault();
  closeContextMenu();
  const menu = el('div', 'pv-ctx-menu');
  for (const en of entries) {
    if (!en) continue;
    const b = el('button', 'pv-ctx-item' + (en.danger ? ' danger' : ''));
    b.type = 'button';
    b.textContent = en.label;
    if (en.title) b.title = en.title;
    if (en.disabled) {
      b.disabled = true;
    } else {
      b.addEventListener('click', () => { closeContextMenu(); en.onClick(); });
    }
    menu.appendChild(b);
  }
  document.body.appendChild(menu);
  const x = Math.min(e.clientX, window.innerWidth - menu.offsetWidth - 8);
  const y = Math.min(e.clientY, window.innerHeight - menu.offsetHeight - 8);
  menu.style.left = `${Math.max(4, x)}px`;
  menu.style.top = `${Math.max(4, y)}px`;
  ctxMenu = menu;
  // Dismiss on the next outside click / escape.
  setTimeout(() => {
    document.addEventListener('click', closeContextMenu, { once: true });
    document.addEventListener('keydown', function onEsc(ev) {
      if (ev.key === 'Escape') { closeContextMenu(); document.removeEventListener('keydown', onEsc); }
    });
  }, 0);
}

// --- Left column: emblem ---------------------------------------------------

function renderEmblem(player) {
  const box = $('profile-emblem');
  if (!box) return;
  const title = activeTitle(player);
  box.innerHTML = `
    <div class="pv-emblem-frame" title="${title.flavor ? esc(title.flavor) : ''}">
      <div class="pv-emblem-aura"></div>
      <div class="pv-emblem-medallion"><span class="pv-emblem-glyph">☯</span></div>
    </div>
    <div class="pv-emblem-name">${player.name}</div>
    <div class="pv-emblem-title">${title.name}</div>`;
}

// --- Left column: Statistics (with stat-point allocation) ------------------

function statRow(label, value, tipKey) {
  const tip = STAT_TIPS[tipKey];
  return `<div class="pv-stat-row"${tip ? ` title="${esc(tip)}"` : ''}><span class="pv-stat-label">${label}</span><span class="pv-stat-value">${value}</span></div>`;
}

// A combat stat row that carries a "+" allocation button. The button is a real
// element wired after innerHTML via [data-stat].
function allocStatRow(label, value, stat, canAlloc) {
  const tip = STAT_TIPS[stat] ?? '';
  const gain = POINT_VALUE[stat] ?? 1;
  const btn = `<button class="pv-alloc-btn" data-stat="${stat}" ${canAlloc ? '' : 'disabled'} title="Spend 1 point: +${gain} ${label}">+</button>`;
  return `<div class="pv-stat-row pv-alloc-row" title="${esc(tip)}">
      <span class="pv-stat-label">${label}</span>
      <span class="pv-stat-value">${value}</span>
      ${btn}
    </div>`;
}

function renderStatistics(state, actions) {
  const box = $('profile-statistics');
  if (!box) return;
  const p = state.player;
  const eff = effectiveStats(p);
  const need = xpForBreakthrough(p.level);
  const atPeak = p.level >= MAX_STAGE;
  const { realm } = realmFor(p.level);
  const qi = state.qi;
  const qiMax = maxQi(p);
  const pts = p.statPoints ?? 0;
  const canAlloc = pts > 0;

  const banner = `<div class="pv-points-banner${canAlloc ? ' on' : ''}" title="Unspent stat points from breakthroughs. Spend them with the + buttons below.">
      ${pts} unspent point${pts === 1 ? '' : 's'}
    </div>`;

  box.innerHTML = `<h3 class="pv-panel-title">Statistics</h3>
    <div class="pv-stat-list">
      ${statRow('Realm', realm, 'realm')}
      ${statRow('Stage', stageName(p.level), 'stage')}
      ${statRow('Level', p.level, 'level')}
      ${statRow('Breakthrough', atPeak ? `${p.xp} · peak` : `${p.xp} / ${need}`, 'breakthrough')}
    </div>
    ${banner}
    <div class="pv-stat-list pv-combat">
      ${allocStatRow('Attack', eff.attack, 'attack', canAlloc)}
      ${allocStatRow('Defense', eff.defense, 'defense', canAlloc)}
      ${allocStatRow('Damage', eff.damage, 'damage', canAlloc)}
      ${allocStatRow('Armor', eff.armor, 'armor', canAlloc)}
      ${allocStatRow('Max HP', eff.maxHp, 'hp', canAlloc)}
    </div>
    <div class="pv-stat-list">
      ${statRow('Qi', `${qi} / ${qiMax}`, 'qi')}
      ${statRow('Spirit Stones', `◆ ${p.spiritStones}`, 'spiritStones')}
      ${statRow('Merit', `✧ ${p.merit ?? 0}`, 'merit')}
      ${statRow('Ascension', p.ascension ? `Tier ${p.ascension}` : '—', 'ascension')}
      ${statRow('Total kills', totalKills(p), 'kills')}
    </div>`;

  // Wire the "+" buttons to the injected allocation action. Guard against an
  // unknown key so only ALLOC_STATS ever reach allocateStat.
  box.querySelectorAll('.pv-alloc-btn').forEach((btn) => {
    const stat = btn.dataset.stat;
    if (!ALLOC_STATS.includes(stat)) return;
    btn.addEventListener('click', () => actions.allocateStat(stat));
  });
}

// --- Left column: Enhancements (equipped set bonuses + opened meridians) ---

function enhanceBar(label, detail, ratio, active) {
  const pct = Math.max(0, Math.min(100, ratio * 100));
  return `<div class="pv-enh-row${active ? ' on' : ''}">
      <div class="pv-enh-head"><span class="pv-enh-name">${label}</span><span class="pv-enh-detail dim">${detail}</span></div>
      <div class="pv-enh-track"><div class="pv-enh-fill" style="width:${pct}%"></div></div>
    </div>`;
}

function bonusText(bonus) {
  return Object.entries(bonus)
    .filter(([, v]) => v)
    .map(([s, v]) => `+${v} ${STAT_LABELS[s] ?? s}`)
    .join(', ');
}

function renderEnhancements(player) {
  const box = $('profile-enhancements');
  if (!box) return;
  const rows = [];

  const seenSets = new Set();
  for (const item of Object.values(player.equipment ?? {})) {
    if (item && item.setId) seenSets.add(item.setId);
  }
  for (const setId of seenSets) {
    const set = SETS[setId];
    if (!set) continue;
    const count = equippedSetCount(player, setId);
    const full = setBonusAtCount(set, set.pieces);
    const complete = count >= set.pieces;
    const detail = complete ? bonusText(full) : `${count}/${set.pieces} pieces`;
    rows.push(enhanceBar(`Set · ${set.name}`, detail, count / set.pieces, complete));
  }

  const nodes = player.meridians?.nodes ?? {};
  for (const [id, rank] of Object.entries(nodes)) {
    const node = MERIDIAN_NODES[id];
    if (!node || rank <= 0) continue;
    const gain = node.perRank * Math.min(rank, node.maxRank);
    rows.push(enhanceBar(`${node.icon} ${node.name}`, `+${gain} ${STAT_LABELS[node.stat] ?? node.stat} · rank ${rank}/${node.maxRank}`, rank / node.maxRank, rank >= node.maxRank));
  }

  box.innerHTML = `<h3 class="pv-panel-title">Enhancements</h3>` +
    (rows.length ? `<div class="pv-enh-list">${rows.join('')}</div>`
      : `<p class="empty-note">No active passives yet. Open meridians on the Skills tab or complete a gear set.</p>`);
}

// --- Right column: Equipment paper-doll ------------------------------------

// FallenSword-style doll: seven framed slots laid out around a silhouette (CSS
// grid-template-areas keys on the slot name). Click an equipped slot to unequip;
// empty slots show a dim glyph. Reads state.player.equipment[slot].
function renderEquipmentDoll(player, actions) {
  const box = $('profile-inventory');
  if (!box) return;
  const equipment = player.equipment ?? {};
  const equippedCount = EQUIP_SLOTS.filter((s) => equipment[s]).length;

  box.innerHTML = `<h3 class="pv-panel-title">Equipment <span class="dim">${equippedCount}/${EQUIP_SLOTS.length} worn</span></h3>`;
  const doll = el('div', 'pv-doll');
  for (const slot of EQUIP_SLOTS) {
    const item = equipment[slot];
    const cell = el('div', 'pv-doll-slot');
    cell.style.gridArea = slot;
    if (item) {
      const btn = itemCell(item, {
        hint: 'Click: unequip',
        onClick: () => actions.onUnequip(slot),
      });
      cell.appendChild(btn);
    } else {
      const empty = el('button', 'item-slot empty');
      empty.type = 'button';
      empty.innerHTML = `<span class="item-icon dim">${SLOT_ICONS[slot]}</span>`;
      empty.title = `Empty ${SLOT_LABELS[slot]} slot`;
      cell.appendChild(empty);
    }
    cell.appendChild(el('span', 'pv-doll-tag', SLOT_LABELS[slot]));
    doll.appendChild(cell);
  }
  box.appendChild(doll);
}

// --- Right column: Inventory (5-wide pack grid) ----------------------------

// The pack as a 5-wide grid of framed cells up to capacity. Click a gear item to
// equip; right-click for a sell / destroy menu.
function renderInventoryGrid(player, actions) {
  const box = $('profile-backpack');
  if (!box) return;
  const inv = player.inventory ?? [];
  const cap = effectiveInventorySize(player);

  box.innerHTML = `<h3 class="pv-panel-title">Inventory <span class="dim">${inv.length} / ${cap}</span></h3>`;
  const grid = el('div', 'pv-inv-grid');

  for (let i = 0; i < cap; i++) {
    const item = inv[i];
    if (!item) {
      grid.appendChild(itemCell(null));
      continue;
    }
    const menu = (e) => openContextMenu(e, [
      { label: 'Equip', title: `Equip this ${item.slot} into your gear.`, onClick: () => actions.onEquip(item.id) },
      { label: `Sell for ${sellValue(item)} ◆`, title: 'Sell this item for spirit stones (only at a Sect haven).', onClick: () => actions.onSell(item.id) },
      { label: 'Destroy', title: 'Permanently delete this item — no reward.', danger: true, onClick: () => { if (confirm(`Destroy ${item.name}? This is permanent.`)) actions.onDestroy(item.id); } },
    ]);
    grid.appendChild(itemCell(item, {
      hint: 'Click: equip · Right-click: sell / destroy',
      onClick: () => actions.onEquip(item.id),
      onMenu: menu,
    }));
  }
  box.appendChild(grid);
}

// --- Right column: Active Buffs --------------------------------------------

function renderActiveBuffs(player) {
  const box = $('profile-active-buffs');
  if (!box) return;
  const now = Date.now();
  const buffs = activeBuffs(player, now);
  const rows = buffs.map((b) => {
    const t = getTech(b.techniqueId);
    const eff = Object.entries(b.effect)
      .map(([s, v]) => `${v > 0 ? '+' : ''}${Math.round(v * 100)}% ${STAT_LABELS[s] ?? s}`)
      .join(', ');
    const left = Math.max(0, Math.ceil((b.expiresAt - now) / 1000));
    return `<div class="pv-buff-row">
        <span class="pv-buff-name">${t?.name ?? b.techniqueId}</span>
        <span class="pv-buff-eff dim">${eff}</span>
        <span class="pv-buff-time">${left}s</span>
      </div>`;
  });
  box.innerHTML = `<h3 class="pv-panel-title">Active Buffs</h3>` +
    (rows.length ? `<div class="pv-buff-list">${rows.join('')}</div>`
      : `<p class="empty-note">[no buffs]</p>`);
}

// --- Public entry ----------------------------------------------------------

// Render the whole Profile page from live state. `actions` are injected by the
// lead (thin wrappers over game.js) so this view stays free of mutating imports.
export function renderProfilePage(state, actions = {}) {
  const a = {
    onEquip: actions.onEquip ?? (() => {}),
    onUnequip: actions.onUnequip ?? (() => {}),
    onSell: actions.onSell ?? (() => {}),
    onDestroy: actions.onDestroy ?? (() => {}),
    allocateStat: actions.allocateStat ?? (() => {}),
  };
  closeContextMenu(); // stale menu shouldn't survive a re-render
  const p = state.player;
  const heading = $('profile-heading');
  if (heading) heading.textContent = `${activeTitle(p).name}'s Profile`;
  renderEmblem(p);
  renderStatistics(state, a);
  renderEnhancements(p);
  renderEquipmentDoll(p, a);
  renderInventoryGrid(p, a);
  renderActiveBuffs(p);
}
