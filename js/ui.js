// Rendering + combat playback. Reads game state, never mutates it except
// through the action functions passed in from main.js.

import { ZONES, portalAt } from './map.js';
import { maxQi, effectiveStats, stageName, totalRepairCost, marketListings, marketPlayerListings, marketMailbox, guildMembers, guildRecruits, guildBuffSummary } from './game.js';
import { MAX_TURNS } from './combat.js';
import { xpForBreakthrough, ALLOC_STATS, POINT_VALUE, MAX_STAGE, ASCENSION_STAT_PER_TIER } from './progression.js';
import { meridianBonuses } from './meridians.js'; // per-source char-sheet stat breakdown
import { sellValue, RARITIES, INVENTORY_SIZE, DROP_CHANCE, effectiveInventorySize } from './items.js';
import { currentQuest, progressText, QUESTS } from './quests.js';
import { CREATURE_TYPES, creatureStatBlock } from './actors.js';
import { CARDS, cardForCreature, cardBonuses, cardBonusText, ownedCardCount } from './cards.js';
import { marketValue } from './market.js';
import { personaById, personaLabel } from './personas.js';
import { SECT_CAPACITY } from './guild.js';
import { activeBuffs } from './techniques.js'; // char-sheet buff breakdown (Skill Tree UI moved to skilltree.js)
import { BOSS_LIST, bossAtLair, bossLairStatus } from './boss.js';
import { beginFx, turnFx, endFx } from './combatfx.js';
import { compareRows, setCompareContext } from './itemcompare.js'; // task Y: hover deltas
import { isGem, gemIcon, gemStatText, socketLine, socketBonuses } from './sockets.js'; // task U: gems + sockets
import { setLine, setSetsContext, setBonuses } from './sets.js'; // task B: gear set progress in tooltip
import { salvageYield, materialName } from './salvage.js'; // task M: salvage yield for the menu entry

const $ = (id) => document.getElementById(id);

// HUD (board task AB): the chip-* spans carry the value text; the bar-* fills
// visualise Qi and breakthrough progress as meters. `barWidth` is defensive so
// renderPlayerBar still works if a layout omits the bar elements.
const pct = (a, b) => (b > 0 ? Math.max(0, Math.min(100, (a / b) * 100)) : 0);
function barWidth(id, ratio) {
  const el = $(id);
  if (el) el.style.width = ratio + '%';
}

export function renderPlayerBar(state) {
  const p = state.player;
  const eff = effectiveStats(p);
  const need = xpForBreakthrough(p.level);
  const atPeak = p.level >= MAX_STAGE;
  const qi = state.qi;
  const qiMax = maxQi(p);
  $('chip-level').textContent = stageName(p.level);
  $('chip-xp').textContent = atPeak ? `${p.xp} · peak` : `${p.xp} / ${need}`;
  $('chip-points').textContent = `✦ ${p.statPoints}`;
  $('chip-points').classList.toggle('attention', p.statPoints > 0);
  $('chip-stones').textContent = `◆ ${p.spiritStones}`;
  $('chip-hp').textContent = eff.maxHp;
  $('chip-qi').textContent = `${qi} / ${qiMax}`;
  // Meter fills.
  barWidth('bar-xp', atPeak ? 100 : pct(p.xp, need));
  barWidth('bar-qi', pct(qi, qiMax));
}

export function renderMap(state, onTileClick) {
  const grid = $('map-grid');
  const size = state.map.size;
  grid.innerHTML = '';
  grid.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tile = state.map.at(x, y);
      const portal = portalAt(state.zoneId, x, y);
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `tile band-${tile.band}`;
      el.dataset.x = x;
      el.dataset.y = y;
      const here = state.pos.x === x && state.pos.y === y;
      const lairBoss = bossAtLair(state.zoneId, x, y);
      const isLair = !!lairBoss;
      const hasBoss = tile.monsters.some((m) => m.isBoss);
      const dots = tile.monsters.filter((m) => !m.isBoss).length; // boss shown as ☠, not a dot
      if (here) el.classList.add('player-here');
      if (tile.isStart) el.classList.add('start-tile');
      if (portal) el.classList.add('portal-tile');
      if (isLair) el.classList.add('lair-tile');
      if (hasBoss) el.classList.add('boss-here');
      el.innerHTML =
        (here ? '<span class="player-marker">☯</span>' : '') +
        (portal ? '<span class="portal-marker">⟠</span>' : '') +
        (isLair ? '<span class="boss-marker">☠</span>' : '') +
        (dots > 0 ? `<span class="monster-dots">${'●'.repeat(dots)}</span>` : '');
      const portalNote = portal ? `, portal to ${ZONES[portal.to].name}` : '';
      const lairNote = isLair ? (hasBoss ? `, ${lairBoss.name} lurks here` : ', an ancient lair') : '';
      el.title = `(${x},${y}) — danger band ${tile.band}${dots ? `, ${dots} creature(s)` : ''}${lairNote}${portalNote}`;
      el.addEventListener('click', () => onTileClick(x, y));
      grid.appendChild(el);
    }
  }
}

// The lair readout shown when the player stands on a calamity's tile but it
// isn't currently manifested — explains why (unworthy / on cooldown).
function bossLairNote(status) {
  const box = document.createElement('div');
  box.className = 'boss-lair-note';
  const name = status.boss.name;
  if (!status.eligible) {
    box.innerHTML = `<span class="boss-tag">☠ ${name}</span>
      <p>A crushing presence slumbers beneath the stone. It will not deign to notice one who has not yet reached <b>${stageName(status.minStage)}</b>.</p>`;
  } else if (status.cooldownLeftMs > 0) {
    const defeats = status.defeats ? ` <span class="dim">(felled ${status.defeats}×)</span>` : '';
    box.innerHTML = `<span class="boss-tag">☠ ${name}</span>
      <p>The calamity has receded into the deep to gather its strength. It re-manifests in <b>${fmtLeft(status.cooldownLeftMs).replace(' left', '')}</b>.${defeats}</p>`;
  } else {
    box.innerHTML = `<span class="boss-tag">☠ ${name}</span><p>The lair stirs…</p>`;
  }
  return box;
}

export function renderTilePanel(state, { onInspect, onAttack, canAttack, onRepair, onTravel }) {
  const zone = ZONES[state.zoneId];
  const tile = state.map.at(state.pos.x, state.pos.y);
  const portal = portalAt(state.zoneId, tile.x, tile.y);
  const havenLabel = tile.isStart ? ` — ${zone.startLabel} (safe)` : '';
  $('tile-title').textContent = `${zone.name} · (${tile.x}, ${tile.y})${havenLabel}`;

  // Location actions come before monsters (GDD §6.6): travel portals, then
  // haven services (repair; selling is enabled in the pack panel at a haven).
  const gate = $('gate-actions');
  gate.innerHTML = '';
  let hasActions = false;

  if (portal) {
    hasActions = true;
    const locked = state.player.level < portal.minStage;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'travel-btn';
    btn.textContent = `Travel to ${ZONES[portal.to].name}`;
    if (locked) {
      btn.disabled = true;
      btn.title = `Requires ${stageName(portal.minStage)}`;
      btn.textContent += ` 🔒`;
    }
    btn.addEventListener('click', () => onTravel(portal));
    gate.appendChild(btn);
  }

  if (tile.isStart) {
    hasActions = true;
    const cost = totalRepairCost(state);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = cost > 0 ? `Repair artifacts (${cost} ◆)` : 'Artifacts fully repaired';
    btn.disabled = cost === 0 || state.player.spiritStones < cost;
    if (cost > state.player.spiritStones) btn.title = 'Not enough spirit stones';
    btn.addEventListener('click', onRepair);
    gate.appendChild(btn);
    const note = document.createElement('p');
    note.className = 'empty-note';
    note.textContent = 'A sect haven — sell items from your pack here.';
    gate.appendChild(note);
  }

  gate.classList.toggle('hidden', !hasActions);

  const list = $('monster-list');
  list.innerHTML = '';

  // Ancient Terror lair (GDD §9.1): when the calamity isn't currently manifested,
  // explain why (not yet worthy / receded on cooldown) instead of a blank tile.
  const boss = bossLairStatus(state);
  if (boss.atLair && !boss.present) list.appendChild(bossLairNote(boss));

  if (tile.monsters.length === 0) {
    const p = document.createElement('p');
    p.className = 'empty-note';
    p.textContent = tile.isStart
      ? 'A place of safety. Nothing hunts you here.'
      : boss.atLair
      ? 'The lair lies quiet — for now.'
      : 'Nothing stirs here. Cleared tiles repopulate after a while.';
    list.appendChild(p);
    return;
  }

  // Multi-monster tile-slot model (doc 40 §6.1): slot N = tile.monsters[N-1],
  // 1-indexed to match the digit key that attacks it (input.js 1-9). The stable
  // slot-number badge makes the key mapping legible; rare-spawn tiers get a
  // distinct row class + tag, and a Titan shows its persisted world-HP progress.
  tile.monsters.forEach((m, i) => {
    const row = document.createElement('div');
    row.className = 'monster-row';
    if (m.isBoss) row.classList.add('boss-row');
    else if (m.isTitan) row.classList.add('titan-row');
    else if (m.isSuperElite) row.classList.add('super-elite-row');
    else if (m.isLegendary) row.classList.add('legendary-row');

    const slotTag = document.createElement('span');
    slotTag.className = 'slot-num';
    slotTag.textContent = `${i + 1}`;
    slotTag.title = `Press ${i + 1} to attack this monster`;

    const label = document.createElement('span');
    label.className = 'monster-name';
    if (m.isBoss) {
      label.innerHTML = `<span class="boss-tag">☠ Legendary</span> ${m.name} <span class="dim">(Lv ${m.level})</span>`;
    } else if (m.isTitan) {
      // titanHp is the persisted world pool; show % remaining so the chase is legible.
      const maxHp = m.titanMaxHp || 1;
      const pct = Math.max(0, Math.round((100 * (m.titanHp ?? maxHp)) / maxHp));
      label.innerHTML = `<span class="titan-tag">⛰ Titan</span> ${m.name} <span class="dim">(Lv ${m.level} · ${pct}% HP)</span>`;
    } else if (m.isSuperElite) {
      // m.name already carries its "Super Elite " prefix from spawnCreature; the
      // span just colours it and marks the row without duplicating the words.
      label.innerHTML = `<span class="rarity-superElite">${m.name}</span> <span class="dim">(Lv ${m.level})</span>`;
    } else if (m.isLegendary) {
      label.innerHTML = `<span class="rarity-legendary">${m.name}</span> <span class="dim">(Lv ${m.level})</span>`;
    } else {
      label.textContent = `${m.name} (Lv ${m.level})`;
    }

    const inspect = document.createElement('button');
    inspect.type = 'button';
    inspect.textContent = '👁';
    inspect.title = 'Inspect before you commit Qi';
    inspect.addEventListener('click', () => onInspect(m, row));

    const atk = document.createElement('button');
    atk.type = 'button';
    atk.className = m.isBoss ? 'attack-btn boss-attack-btn' : m.isTitan ? 'attack-btn titan-attack-btn' : 'attack-btn';
    atk.textContent = m.isBoss ? 'Challenge' : m.isTitan ? 'Assault' : 'Attack';
    if (!canAttack()) {
      atk.disabled = true;
      atk.title = `Need ${MAX_TURNS} Qi to attack`;
    } else if (m.isTitan) {
      atk.title = 'Chip the Titan down — it flees to a new tile each time it survives.';
    }
    atk.addEventListener('click', () => onAttack(m.id));

    row.append(slotTag, label, inspect, atk);
    list.appendChild(row);
  });
}

export function toggleInspect(monster, row) {
  const existing = row.querySelector('.inspect-box');
  if (existing) {
    existing.remove();
    return;
  }
  const box = document.createElement('div');
  box.className = 'inspect-box';
  const s = monster.stats;
  box.textContent = `ATK ${s.attack} · DEF ${s.defense} · DMG ${s.damage} · ARM ${s.armor} · HP ${monster.hp}/${monster.maxHp} · ~${monster.xpReward} XP, ~${monster.stoneReward} stones`;
  row.appendChild(box);
}

// --- Tooltip + context-menu overlays (created once, shared by all items) ---

let tipEl = null;
let menuEl = null;

function ensureOverlays() {
  if (tipEl) return;
  tipEl = document.createElement('div');
  tipEl.id = 'tooltip';
  document.body.appendChild(tipEl);
  menuEl = document.createElement('div');
  menuEl.id = 'ctx-menu';
  document.body.appendChild(menuEl);
  document.addEventListener('click', hideMenu);
  document.addEventListener('scroll', hideMenu, true);
}

function placeAt(el, x, y) {
  const pad = 14;
  el.style.left = Math.min(x + pad, window.innerWidth - el.offsetWidth - 8) + 'px';
  el.style.top = Math.min(y + pad, window.innerHeight - el.offsetHeight - 8) + 'px';
}

function attachTooltip(el, htmlFn) {
  ensureOverlays();
  el.addEventListener('mouseenter', (e) => {
    tipEl.innerHTML = htmlFn();
    tipEl.style.display = 'block';
    placeAt(tipEl, e.clientX, e.clientY);
  });
  el.addEventListener('mousemove', (e) => placeAt(tipEl, e.clientX, e.clientY));
  el.addEventListener('mouseleave', hideTip);
}

function hideTip() {
  if (tipEl) tipEl.style.display = 'none';
}

function openMenu(e, entries) {
  ensureOverlays();
  e.preventDefault();
  e.stopPropagation();
  hideTip();
  menuEl.innerHTML = '';
  for (const entry of entries) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = entry.label;
    if (entry.danger) btn.classList.add('danger-btn');
    if (entry.disabled) btn.disabled = true;
    if (entry.title) btn.title = entry.title;
    btn.addEventListener('click', () => {
      hideMenu();
      entry.onClick();
    });
    menuEl.appendChild(btn);
  }
  menuEl.style.display = 'flex';
  placeAt(menuEl, e.clientX, e.clientY);
}

function hideMenu() {
  if (menuEl) menuEl.style.display = 'none';
}

// --- Character sheet with stat allocation (two stats per row) ---

const STAT_LABELS = { attack: 'Attack', defense: 'Defense', damage: 'Damage', armor: 'Armor', hp: 'Max HP' };

export function renderCharSheet(state, onAllocate) {
  const p = state.player;
  const eff = effectiveStats(p);
  const box = $('char-stats');
  box.innerHTML = '';

  // True per-source stat breakdown mirroring progression.js effectiveStats
  // exactly: base + trained + gear + cards + meridians + gems + set (flat),
  // then technique/pill percentage buffs, then the global ascension scalar. Each
  // flat source is summed the same way (and honours the same broken-gear rule) as
  // effectiveStats, so the displayed parts recombine to the effective total.
  const now = Date.now();
  const cardStat = cardBonuses(p).stat;
  const merStat = meridianBonuses(p);
  const socketStat = socketBonuses(p);
  const setStat = setBonuses(p);
  // Real gear sum (same iteration + broken-gear skip as effectiveStats).
  const gearSum = { attack: 0, defense: 0, damage: 0, armor: 0, hp: 0 };
  for (const item of Object.values(p.equipment)) {
    if (!item || item.durability <= 0) continue; // broken gear grants nothing
    for (const [s, v] of Object.entries(item.bonuses)) gearSum[s] += v;
  }
  const buffs = activeBuffs(p, now);
  const asc = p.ascension ?? 0;

  const grid = document.createElement('div');
  grid.className = 'stat-grid';
  for (const stat of ALLOC_STATS) {
    const effKey = stat === 'hp' ? 'maxHp' : stat;
    // Flat parts. `stat` is already the bonus-map key ('hp' for Max HP), matching
    // gearSum/cardStat/merStat/socketStat/setStat which all key HP as 'hp'.
    const base = p.base[effKey];
    const trained = p.allocated[stat] * POINT_VALUE[stat];
    const gearPart = gearSum[stat] ?? 0;
    const cardPart = cardStat[stat] ?? 0;
    const merPart = merStat[stat] ?? 0;
    const gemPart = socketStat[stat] ?? 0;
    const setPart = setStat[stat] ?? 0;

    // Flat subtotal, then the percentage buffs and ascension scalar applied with
    // the SAME rounding as effectiveStats (per-buff round; final ascension round).
    let val = base + trained + gearPart + cardPart + merPart + gemPart + setPart;
    const flatSubtotal = val;
    for (const buff of buffs) {
      const pct = buff.effect[stat];
      if (pct != null) val = Math.max(1, Math.round(val * (1 + pct)));
    }
    const buffedVal = val;
    if (asc > 0) val = Math.max(1, Math.round(val * (1 + ASCENSION_STAT_PER_TIER * asc)));

    // Compose the flat line: base + trained + gear always shown (matches the
    // legacy tooltip for a bonus-free player); the newer flat sources are shown
    // only when non-zero to keep it compact.
    const flatBits = [`${base} base`, `${trained} trained`, `${gearPart} gear`];
    if (cardPart) flatBits.push(`${cardPart} cards`);
    if (merPart) flatBits.push(`${merPart} meridians`);
    if (gemPart) flatBits.push(`${gemPart} gems`);
    if (setPart) flatBits.push(`${setPart} set`);
    const hasFlatExtra = cardPart || merPart || gemPart || setPart;
    // Show the running subtotal only when there's more math to follow (buffs or
    // ascension) so the reader can trace flat → buffed → final.
    const showSubtotal = (buffedVal !== flatSubtotal) || asc > 0;
    let flatLine = flatBits.join(' + ');
    if (hasFlatExtra && showSubtotal) flatLine += ` = ${flatSubtotal}`;

    // Modifier line: technique/pill % buffs then the ascension multiplier.
    const modBits = [];
    if (buffedVal !== flatSubtotal) modBits.push(`buffs → ${buffedVal}`);
    if (asc > 0) modBits.push(`×${(1 + ASCENSION_STAT_PER_TIER * asc).toFixed(2)} ascension (tier ${asc}) → ${val}`);
    const modLine = modBits.length ? `<div class="tt-line">${modBits.join(' · ')}</div>` : '';

    const cell = document.createElement('div');
    cell.className = 'stat-cell';
    cell.innerHTML = `<span class="stat-label">${STAT_LABELS[stat]}</span><span class="stat-value">${eff[effKey]}</span>`;
    attachTooltip(
      cell,
      () =>
        `<div class="tt-name">${STAT_LABELS[stat]}: ${eff[effKey]}</div>
         <div class="tt-line">${flatLine}</div>${modLine}`
    );
    if (p.statPoints > 0) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'alloc-btn';
      btn.textContent = `+${POINT_VALUE[stat]}`;
      btn.title = `Spend 1 point: +${POINT_VALUE[stat]} ${STAT_LABELS[stat]}`;
      btn.addEventListener('click', () => onAllocate(stat));
      cell.appendChild(btn);
    }
    grid.appendChild(cell);
  }
  box.appendChild(grid);

  const foot = document.createElement('p');
  foot.className = 'empty-note';
  foot.textContent =
    p.statPoints > 0
      ? `${p.statPoints} stat point(s) to spend.`
      : `Breakthroughs grant 3 stat points. Technique points banked: ${p.skillPoints} (techniques unlock in Stage 2).`;
  box.appendChild(foot);
}

// --- Equipment + inventory: FallenSword-style icon grids. Click a pack item
// to equip (swapping the worn piece back into the pack, GDD §6.2); click an
// equipped item to unequip; right-click for sell/destroy options. ---

const SLOT_ICONS = { weapon: '⚔️', robe: '👘' };

function itemTooltip(item, hint) {
  // Gems (task U) are their own item kind — no slot/durability/compare; show the
  // single flat bonus they grant when socketed.
  if (isGem(item)) {
    return `<div class="tt-name rarity-${item.rarity}">${gemIcon(item)} ${item.name}</div>
      <div class="tt-line dim">Lv ${item.level} gem · ${RARITIES[item.rarity].label}</div>
      <div class="tt-line">${gemStatText(item)} when socketed</div>
      <div class="tt-hint">${hint}</div>`;
  }
  const stats = Object.entries(item.bonuses)
    .map(([s, v]) => `<div class="tt-line">+${v} ${STAT_LABELS[s] ?? s}</div>`)
    .join('');
  const dur =
    item.durability <= 0
      ? '<div class="tt-line broken">BROKEN — grants no bonuses until repaired</div>'
      : `<div class="tt-line dim">Durability ${item.durability}/${item.maxDurability}</div>`;
  return `<div class="tt-name rarity-${item.rarity}">${item.name}</div>
    <div class="tt-line dim">Lv ${item.level} ${item.slot} · ${RARITIES[item.rarity].label}</div>
    ${stats}${dur}
    ${socketLine(item)}
    ${setLine(item)}
    ${compareRows(item)}
    <div class="tt-hint">${hint}</div>`;
}

function makeItemSlot(item, { label, onClick, onMenu, tooltipHint }) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'item-slot';
  if (item) {
    el.classList.add(`icon-${item.rarity}`);
    if (isGem(item)) {
      // Gems (task U): no slot glyph / durability bar — just the gem icon.
      el.classList.add('is-gem');
      el.innerHTML = `<span class="item-icon">${gemIcon(item)}</span>`;
    } else {
      const pct = Math.round((item.durability / item.maxDurability) * 100);
      const durClass = item.durability <= 0 ? 'broken' : pct < 25 ? 'low' : '';
      el.innerHTML = `<span class="item-icon">${SLOT_ICONS[item.slot]}</span>
        <span class="dur-bar"><span class="dur-fill ${durClass}" style="width:${Math.max(4, pct)}%"></span></span>`;
    }
    attachTooltip(el, () => itemTooltip(item, tooltipHint));
    el.addEventListener('click', () => {
      hideTip();
      onClick();
    });
    if (onMenu) el.addEventListener('contextmenu', onMenu);
  } else {
    el.classList.add('empty');
    el.innerHTML = label ? `<span class="item-icon dim">${SLOT_ICONS[label]}</span>` : '';
    if (label) attachTooltip(el, () => `<div class="tt-name dim">Empty ${label} slot</div>`);
  }
  if (label) {
    const tag = document.createElement('span');
    tag.className = 'slot-tag';
    tag.textContent = label;
    el.appendChild(tag);
  }
  return el;
}

// A right-click "Salvage" menu entry: break an item down into spirit essence
// (task M). Guarded so a missing handler is a no-op; confirms like Destroy,
// showing the essence yield.
function salvageEntry(item, onSalvage) {
  const y = salvageYield(item);
  const label = y ? `Salvage → ${y.qty} ${materialName(y.materialId)}` : 'Salvage';
  return {
    label,
    title: y ? `Break this item down into ${y.qty} ${materialName(y.materialId)} — permanent, used to mend gear at the ♻ Salvage Workbench.` : 'Break this item down into spirit essence — permanent.',
    onClick: () => {
      if (!onSalvage || !y) return;
      if (confirm(`Salvage ${item.name} into ${y.qty} ${materialName(y.materialId)}? This is permanent.`)) onSalvage(item.id);
    },
  };
}

export function renderGear(state, { onEquip, onUnequip, onSell, onDestroy, onSalvage, atGate }) {
  const p = state.player;
  setCompareContext(p); // task Y: give itemcompare the live equipment to diff against
  setSetsContext(p); // task B: give sets the live equipment for tooltip progress
  const slots = $('equipment-slots');
  slots.innerHTML = '';
  for (const slot of ['weapon', 'robe']) {
    slots.appendChild(
      makeItemSlot(p.equipment[slot], {
        label: slot,
        tooltipHint: 'Click: unequip',
        onClick: () => onUnequip(slot),
      })
    );
  }

  const packSize = effectiveInventorySize(p);
  $('pack-count').textContent = `${p.inventory.length}/${packSize}`;
  const inv = $('inventory-list');
  inv.innerHTML = '';
  for (let i = 0; i < packSize; i++) {
    const item = p.inventory[i];
    if (!item) {
      inv.appendChild(makeItemSlot(null, {}));
      continue;
    }
    if (isGem(item)) {
      // Gems (task U) don't equip — they socket into gear via the 💎 Jewelcraft
      // modal (sockets.js). Click is a no-op; right-click still sells/destroys.
      inv.appendChild(
        makeItemSlot(item, {
          tooltipHint: atGate ? 'Socket in 💎 Jewelcraft · Right-click: sell / destroy' : 'Socket in 💎 Jewelcraft · Right-click: destroy (sell at Sect Gate)',
          onClick: () => {},
          onMenu: (e) =>
            openMenu(e, [
              { label: `Sell for ${sellValue(item)} ◆`, title: atGate ? `Sell this gem to the Sect Gate for ${sellValue(item)} spirit stones ◆.` : 'Selling is only available at the Sect Gate.', disabled: !atGate, onClick: () => onSell(item.id) },
              salvageEntry(item, onSalvage),
              {
                label: 'Destroy',
                title: 'Permanently delete this gem — no reward.',
                danger: true,
                onClick: () => {
                  if (confirm(`Destroy ${item.name}? This is permanent.`)) onDestroy(item.id);
                },
              },
            ]),
        })
      );
      continue;
    }
    inv.appendChild(
      makeItemSlot(item, {
        tooltipHint: atGate ? 'Click: equip · Right-click: sell / destroy' : 'Click: equip · Right-click: destroy (sell at Sect Gate)',
        onClick: () => onEquip(item.id),
        onMenu: (e) =>
          openMenu(e, [
            { label: 'Equip', title: `Equip this ${item.slot} into your gear.`, onClick: () => onEquip(item.id) },
            {
              label: `Sell for ${sellValue(item)} ◆`,
              title: atGate ? `Sell this item to the Sect Gate for ${sellValue(item)} spirit stones ◆.` : 'Selling is only available at the Sect Gate.',
              disabled: !atGate,
              onClick: () => onSell(item.id),
            },
            salvageEntry(item, onSalvage),
            {
              label: 'Destroy',
              title: 'Permanently delete this item — no reward.',
              danger: true,
              onClick: () => {
                if (confirm(`Destroy ${item.name}? This is permanent.`)) onDestroy(item.id);
              },
            },
          ]),
      })
    );
  }
}

// --- Quest panel ---

export function renderQuests(state, onClaim) {
  const qs = state.quests;
  const q = currentQuest(qs);
  const box = $('quest-body');
  box.innerHTML = '';
  if (!q) {
    box.innerHTML = `<p class="empty-note">All sect missions complete (${QUESTS.length}/${QUESTS.length}). More await in the next zone.</p>`;
    return;
  }
  const title = document.createElement('p');
  title.className = 'quest-title';
  title.innerHTML = `${q.title} <span class="dim">(${qs.index + 1}/${QUESTS.length})</span>`;
  const text = document.createElement('p');
  text.className = 'quest-text';
  text.textContent = q.text;
  const prog = document.createElement('p');
  prog.className = 'quest-progress';
  prog.textContent = `Progress: ${progressText(qs)}`;
  box.append(title, text, prog);

  const rewardBits = [];
  if (q.reward.stones) rewardBits.push(`${q.reward.stones} ◆`);
  if (q.reward.xp) rewardBits.push(`${q.reward.xp} XP`);
  if (q.reward.item) rewardBits.push(`a ${RARITIES[q.reward.item.rarity].label.toLowerCase()} ${q.reward.item.slot}`);
  const rew = document.createElement('p');
  rew.className = 'dim quest-reward';
  rew.textContent = `Reward: ${rewardBits.join(', ')}`;
  box.appendChild(rew);

  if (qs.claimable) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'claim-btn';
    btn.textContent = 'Claim reward';
    btn.title = `Claim: ${rewardBits.join(', ')}.`;
    btn.addEventListener('click', onClaim);
    box.appendChild(btn);
  }
}

// --- Techniques UI moved to js/skilltree.js (Wave 3). The old
// renderTechniques/renderActiveBuffs lived here and referenced the removed
// `prereqs` field; the Skill Tree surface supersedes them. ---

export function renderEventLog(state) {
  const ul = $('event-list');
  ul.innerHTML = '';
  for (const entry of state.log) {
    const li = document.createElement('li');
    li.textContent = entry.msg;
    ul.appendChild(li);
  }
}

// --- Combat playback (GDD §8.6): the result already exists in full; we step
// through turns[] on a timer, with Skip jumping straight to the end state.

const TURN_MS = 450;
let playback = null;

// Instant-resolution preference (GDD §8.6.4) — a display setting, not game
// state, so it lives outside the save under its own key.
const INSTANT_KEY = 'fallen-immortal-instant';

function isInstant() {
  return localStorage.getItem(INSTANT_KEY) !== '0';
}

export function initCombatSettings() {
  const chk = $('chk-instant');
  chk.checked = isInstant();
  chk.addEventListener('change', () => {
    localStorage.setItem(INSTANT_KEY, chk.checked ? '1' : '0');
  });
}

export function playCombat(state, result, onDone) {
  const panel = $('combat-panel');
  const log = $('combat-log');
  const outcome = $('combat-outcome');
  const skip = $('btn-skip');
  const close = $('btn-close-combat');

  panel.classList.remove('hidden');
  outcome.classList.add('hidden');
  close.classList.add('hidden');
  skip.classList.remove('hidden');
  log.innerHTML = '';
  $('combat-title').textContent = `You vs ${result.monster.name} (Lv ${result.monster.level})`;

  // Combat "juice" layer (task W): purely presentational, reads result only.
  beginFx(result, isInstant());

  const lines = result.turns.map((t) => turnLine(t, result.monster));

  let i = 0;
  const showNext = () => {
    if (i >= lines.length) {
      finish();
      return;
    }
    log.insertAdjacentHTML('beforeend', lines[i]);
    log.scrollTop = log.scrollHeight;
    turnFx(result.turns[i]); // fx for the turn just rendered
    i++;
    playback = setTimeout(showNext, TURN_MS);
  };

  const finish = () => {
    clearTimeout(playback);
    playback = null;
    while (i < lines.length) {
      log.insertAdjacentHTML('beforeend', lines[i]);
      i++;
    }
    log.scrollTop = log.scrollHeight;
    outcome.innerHTML = outcomeBanner(result);
    outcome.classList.remove('hidden');
    skip.classList.add('hidden');
    close.classList.remove('hidden');
    endFx(result); // resolution flourish + final HP snap (task W)
    onDone();
  };

  skip.onclick = finish;
  close.onclick = () => panel.classList.add('hidden');

  if (isInstant()) finish();
  else showNext();
}

function swingText(who, swing, targetHp) {
  if (!swing) return '';
  const you = who === 'You';
  return swing.hit
    ? `${who} ${you ? 'hit' : 'hits'} for <b>${swing.dmg}</b> (${targetHp} HP left). `
    : `${who} ${you ? 'miss' : 'misses'}. `;
}

function turnLine(t, monster) {
  let s = `<div class="turn-line"><span class="round">T${t.round}</span> `;
  s += swingText('You', t.attackerSwing, t.defenderHpAfter);
  if (t.defenderHpAfter === 0) {
    s += `<b>${monster.name} falls!</b>`;
  } else {
    s += swingText(monster.name, t.defenderSwing, t.attackerHpAfter);
    if (t.attackerHpAfter === 0) s += '<b>You fall!</b>';
  }
  return s + '</div>';
}

// A Titan that survived the encounter chips its persisted world-HP and bounds to
// a new tile — surface that progress so the chase reads clearly in the panel.
function titanProgressBanner(tp) {
  if (!tp || tp.depleted) return '';
  const pct = Math.max(0, Math.round((100 * tp.remainingHp) / (tp.maxHp || 1)));
  const moved = tp.movedTo ? ` It bounds to (${tp.movedTo.x}, ${tp.movedTo.y}).` : '';
  return `<div class="banner titan-chase">⛰ THE TITAN ENDURES — ${pct}% world-HP remaining.${moved} Hunt it down and strike again.</div>`;
}

function outcomeBanner(result) {
  if (result.outcome === 'win') {
    const r = result.rewards;
    const drop = r.itemDrop ? `, looted <span class="rarity-${r.itemDrop.rarity}">${r.itemDrop.name}</span>` : '';
    let banner;
    if (result.bossKill) {
      banner = `<div class="banner boss-win">☠ CALAMITY FELLED — ${result.monster.name} is vanquished! +${r.xp} XP, +${r.stones} spirit stones${drop} <span class="dim">(${result.staminaSpent} Qi spent)</span></div>`;
    } else if (result.titanProgress && result.titanProgress.depleted) {
      banner = `<div class="banner titan-win">⛰ TITAN FELLED — ${result.monster.name} collapses! +${r.xp} XP, +${r.stones} spirit stones${drop} <span class="dim">(${result.staminaSpent} Qi spent)</span></div>`;
    } else {
      banner = `<div class="banner win">VICTORY — +${r.xp} XP, +${r.stones} spirit stones${drop} <span class="dim">(${result.staminaSpent} Qi spent)</span></div>`;
    }
    if (result.cardDrop) banner += cardDropBanner(result.cardDrop);
    return banner;
  }
  if (result.outcome === 'loss') {
    const p = result.penalty;
    return `<div class="banner loss">DEFEAT — lost ${p.stonesLost} stones, ${p.xpLost} XP <span class="dim">(${result.staminaSpent} Qi spent)</span></div>`
      + titanProgressBanner(result.titanProgress);
  }
  return `<div class="banner draw">UNRESOLVED — ${MAX_TURNS} turns passed; this foe is beyond you for now <span class="dim">(${result.staminaSpent} Qi spent)</span></div>`
    + titanProgressBanner(result.titanProgress);
}

function cardDropBanner(cd) {
  const c = cd.card;
  if (cd.kind === 'new') {
    return `<div class="banner card-drop">✦ SPIRIT CARD — ${c.creatureName} obtained! <span class="dim">${cardBonusText(c, 1)}</span></div>`;
  }
  if (cd.kind === 'upgrade') {
    return `<div class="banner card-drop">✦ SPIRIT CARD refined — ${c.creatureName} → Lv ${cd.level} <span class="dim">${cardBonusText(c, cd.level)}</span></div>`;
  }
  if (cd.kind === 'duplicate') {
    return `<div class="banner card-drop">✦ Duplicate ${c.creatureName} card dissolves into +${cd.stones} spirit stones</div>`;
  }
  return '';
}

// --- Beast Codex (GDD §7.1) + Spirit Card collection (GDD §7.2). A modal over
// the bestiary kill data with progressive disclosure by kill count; each entry
// doubles as the card-collection slot (silhouette until owned). ---

const CODEX_STATS_AT = 10; // kills to reveal full combat stats
const CODEX_DROPS_AT = 50; // kills to reveal the drop table
const CODEX_CARD_AT = 100; // kills to reveal the Spirit Card drop chance + mastery

function cardBonusSummary(player) {
  const { stat, meta } = cardBonuses(player);
  const parts = [];
  for (const [k, v] of Object.entries(stat)) if (v) parts.push(`+${v} ${STAT_LABELS[k]}`);
  if (meta.qiCap) parts.push(`+${meta.qiCap} max Qi`);
  if (meta.stones) parts.push(`+${meta.stones} spirit stones/hr`);
  return parts;
}

function codexCardSlot(card, level) {
  const owned = level > 0;
  if (!owned) {
    return `<div class="card-slot locked" title="Spirit Card — undiscovered">
      <span class="card-mark">✦</span></div>`;
  }
  return `<div class="card-slot owned" title="${card.creatureName} Spirit Card">
    <span class="card-mark">✦</span>
    <span class="card-lvl">${level}/${card.maxLevel}</span></div>`;
}

function codexEntry(state, typeId) {
  const p = state.player;
  const t = CREATURE_TYPES[typeId];
  const entry = p.bestiary[typeId];
  const discovered = !!entry;
  const kills = entry?.kills ?? 0;
  const card = cardForCreature(typeId);
  const cardLevel = p.cards[card.id] ?? 0;
  const mastered = kills >= CODEX_CARD_AT;

  const el = document.createElement('div');
  el.className = 'codex-entry';
  if (!discovered) el.classList.add('undiscovered');
  if (mastered) el.classList.add('mastered');

  if (!discovered) {
    el.innerHTML = `
      <div class="codex-head">
        <div class="codex-title">??? <span class="dim">— undiscovered</span></div>
        ${codexCardSlot(card, 0)}
      </div>
      <p class="empty-note">Encounter this beast — inspect or fight it — to begin its codex entry.</p>`;
    return el;
  }

  const bandLabel = t.levels[0] === t.levels[t.levels.length - 1] ? `Lv ${t.levels[0]}` : `Lv ${t.levels[0]}–${t.levels[t.levels.length - 1]}`;

  let body = `<p class="codex-flavor">${t.flavor}</p>
    <p class="codex-kills" title="${mastered ? 'Mastered — you have slain this beast at least 100 times.' : `Slay ${CODEX_CARD_AT - kills} more for the mastery mark.`}">Kills: <b>${kills}</b>${mastered ? ' <span class="mastery">✦ mastered</span>' : ''}</p>`;

  // 10 kills: full combat stats (GDD §7.1 disclosure thresholds).
  if (kills >= CODEX_STATS_AT) {
    const s = creatureStatBlock(typeId);
    body += `<p class="codex-line">ATK ${s.attack} · DEF ${s.defense} · DMG ${s.damage} · ARM ${s.armor} · HP ${s.maxHp} <span class="dim">(at ${bandLabel === `Lv ${t.levels[0]}` ? bandLabel : `Lv ${t.levels[0]}`})</span></p>
      <p class="codex-line dim">Rewards ~${s.xp} XP, ~${s.stones} spirit stones</p>`;
  } else {
    body += `<p class="codex-line locked-line" title="Slay ${CODEX_STATS_AT - kills} more of this beast to reveal its combat stats.">Combat stats revealed at ${CODEX_STATS_AT} kills.</p>`;
  }

  // 50 kills: drop table.
  if (kills >= CODEX_DROPS_AT) {
    body += `<p class="codex-line">Drops: artifacts up to <span class="rarity-rare">Rare</span> · ~${Math.round(DROP_CHANCE * 100)}% per kill</p>`;
  } else {
    body += `<p class="codex-line locked-line" title="Slay ${CODEX_DROPS_AT - kills} more of this beast to reveal its drop table.">Drop table revealed at ${CODEX_DROPS_AT} kills.</p>`;
  }

  // 100 kills: Spirit Card drop chance + mastery mark.
  const cardChanceLine = kills >= CODEX_CARD_AT
    ? `<p class="codex-line">Spirit Card: <b>${(card.dropChance * 100).toFixed(1)}%</b> per kill · ${cardBonusText(card, 1)}/level</p>`
    : `<p class="codex-line locked-line" title="Slay ${CODEX_CARD_AT - kills} more of this beast to reveal its Spirit Card drop chance.">Spirit Card drop chance revealed at ${CODEX_CARD_AT} kills.</p>`;

  const cardStatusLine = cardLevel > 0
    ? `<p class="codex-line card-owned">Card held: Lv ${cardLevel}/${card.maxLevel} — <b>${cardBonusText(card, cardLevel)}</b></p>`
    : `<p class="codex-line dim">Spirit Card not yet obtained.</p>`;

  el.innerHTML = `
    <div class="codex-head">
      <div class="codex-title">${t.name} <span class="dim">${bandLabel}</span></div>
      ${codexCardSlot(card, cardLevel)}
    </div>
    ${body}${cardChanceLine}${cardStatusLine}`;
  return el;
}

// Human-readable drop line for a boss's codex entry, derived from its
// `drop` config rather than hardcoded — mirrors boss.js `onBossDefeated`'s
// own defaults exactly (legacy shape: base Epic → chance Legendary).
function bossDropLine(boss) {
  const d = boss.drop;
  const baseRarity = d.baseRarity ?? 'epic';
  const upgradeRarity = d.upgradeRarity ?? 'legendary';
  const upgradeChance = d.upgradeChance ?? d.legendaryChance ?? 0;
  const baseLabel = RARITIES[baseRarity].label;
  const baseClass = `rarity-${baseRarity}`;
  const base = `a guaranteed <span class="${baseClass}">${baseLabel}</span> artifact`;
  if (upgradeChance <= 0) return `${base}`;
  const upgradeLabel = RARITIES[upgradeRarity].label;
  const upgradeClass = `rarity-${upgradeRarity}`;
  return `${base} (a chance at <span class="${upgradeClass}">${upgradeLabel}</span>)`;
}

// A calamity's codex entry (GDD §9.1) — hand-authored, separate from the
// random-spawn beast roster. Full lore + stats once discovered (inspected or
// fought); a teasing locked entry beforehand. Doubles as the boss card slot.
function bossCodexEntry(state, boss) {
  const p = state.player;
  const discovered = !!p.bestiary[boss.typeId];
  const card = cardForCreature(boss.typeId);
  const cardLevel = p.cards[card.id] ?? 0;
  const defeats = p.boss?.[boss.id]?.defeats ?? 0;

  const el = document.createElement('div');
  el.className = 'codex-entry codex-legendary';
  if (!discovered) el.classList.add('undiscovered');

  if (!discovered) {
    el.innerHTML = `
      <div class="codex-head">
        <div class="codex-title">☠ ??? <span class="dim">— a calamity said to sleep beneath the Gorge</span></div>
        ${codexCardSlot(card, 0)}
      </div>
      <p class="empty-note">Reach ${stageName(boss.minStage)} and seek ${boss.lairHint}. Something ancient waits there.</p>`;
    return el;
  }

  const s = boss.stats;
  const cardStatusLine = cardLevel > 0
    ? `<p class="codex-line card-owned">Card held: Lv ${cardLevel}/${card.maxLevel} — <b>${cardBonusText(card, cardLevel)}</b></p>`
    : `<p class="codex-line dim">Spirit Card not yet obtained — the calamity guards it well.</p>`;

  el.innerHTML = `
    <div class="codex-head">
      <div class="codex-title">☠ ${boss.name} <span class="dim">Lv ${boss.level} · ${boss.title}</span></div>
      ${codexCardSlot(card, cardLevel)}
    </div>
    <p class="codex-flavor">${boss.flavor}</p>
    <p class="codex-kills">Vanquished: <b>${defeats}</b>${defeats ? ' <span class="mastery">☠ calamity-breaker</span>' : ''}</p>
    <p class="codex-line">ATK ${s.attack} · DEF ${s.defense} · DMG ${s.damage} · ARM ${s.armor} · HP ${boss.maxHp}</p>
    <p class="codex-line">Drops: ${bossDropLine(boss)} · <b>${Math.round(boss.cardDropChance * 100)}%</b> Spirit Card</p>
    ${cardStatusLine}`;
  return el;
}

export function renderCodex(state) {
  const p = state.player;
  const total = Object.keys(CARDS).length; // includes the boss cards
  const beastTotal = Object.keys(CREATURE_TYPES).length + BOSS_LIST.length; // + the calamities
  const discoveredCount =
    Object.keys(CREATURE_TYPES).filter((id) => p.bestiary[id]).length +
    BOSS_LIST.filter((b) => p.bestiary[b.typeId]).length;
  $('codex-count').textContent = `— ${discoveredCount}/${beastTotal} beasts · ${ownedCardCount(p)}/${total} cards`;

  const summaryBox = $('codex-summary');
  const bonuses = cardBonusSummary(p);
  summaryBox.innerHTML = bonuses.length
    ? `<span class="codex-summary-label">Active card bonuses:</span> ${bonuses.map((b) => `<span class="card-bonus-chip">${b}</span>`).join(' ')}`
    : `<span class="empty-note">No Spirit Cards collected yet. Slain beasts have a small chance to yield their card — always-on bonuses, no equipping.</span>`;

  const body = $('codex-body');
  body.innerHTML = '';
  for (const typeId of Object.keys(CREATURE_TYPES)) {
    body.appendChild(codexEntry(state, typeId));
  }
  // Legendary section: the calamities sit apart from the random beast roster.
  const legHead = document.createElement('h3');
  legHead.className = 'codex-section-head';
  legHead.textContent = BOSS_LIST.length > 1 ? '☠ Legendary Calamities' : '☠ Legendary Calamity';
  body.appendChild(legHead);
  for (const boss of BOSS_LIST) body.appendChild(bossCodexEntry(state, boss));
}

export function initCodex(state) {
  const overlay = $('codex-overlay');
  const open = () => {
    renderCodex(state);
    overlay.classList.remove('hidden');
  };
  const close = () => overlay.classList.add('hidden');
  $('btn-codex').addEventListener('click', open);
  $('btn-close-codex').addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
}

// --- Treasure Pavilion (GDD §6.7). A tabbed modal over the MarketProvider:
// Browse (buy), Sell (list pack items), My Listings (active + cancel), Mailbox
// (collect proceeds). Actions are passed in from main.js so this stays a pure
// view; after each action the modal and mailbox badge re-render. ---

let pav = null; // { state, actions }
let pavTab = 'buy';
const pavFilters = { slot: 'all', rarity: 'all', sort: 'price-asc' };

function fmtLeft(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  if (s >= 60) return `${Math.ceil(s / 60)}m left`;
  return `${s}s left`;
}

function pavItemIcon(item) {
  const el = document.createElement('div');
  el.className = `item-slot pav-icon icon-${item.rarity}`;
  el.innerHTML = `<span class="item-icon">${SLOT_ICONS[item.slot]}</span>`;
  attachTooltip(el, () => itemTooltip(item, `Fair value ≈ ${marketValue(item)} ◆`));
  return el;
}

function selectControl(label, value, options, onChange) {
  const wrap = document.createElement('label');
  wrap.className = 'pav-filter';
  wrap.textContent = label + ' ';
  const sel = document.createElement('select');
  for (const [val, text] of options) {
    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent = text;
    if (val === value) opt.selected = true;
    sel.appendChild(opt);
  }
  sel.addEventListener('change', () => onChange(sel.value));
  wrap.appendChild(sel);
  return wrap;
}

function emptyNote(text) {
  const p = document.createElement('p');
  p.className = 'empty-note';
  p.textContent = text;
  return p;
}

function renderBuyTab(body) {
  const { state, actions } = pav;
  const bar = document.createElement('div');
  bar.className = 'pav-filter-bar';
  bar.append(
    selectControl('Type', pavFilters.slot, [['all', 'All'], ['weapon', 'Weapons'], ['robe', 'Robes']], (v) => { pavFilters.slot = v; renderPavilionBody(); }),
    selectControl('Rarity', pavFilters.rarity, [['all', 'All'], ['common', 'Common'], ['uncommon', 'Uncommon'], ['rare', 'Rare']], (v) => { pavFilters.rarity = v; renderPavilionBody(); }),
    selectControl('Sort', pavFilters.sort, [['price-asc', 'Cheapest'], ['price-desc', 'Priciest']], (v) => { pavFilters.sort = v; renderPavilionBody(); })
  );
  body.appendChild(bar);

  const listings = marketListings(state, pavFilters);
  if (listings.length === 0) {
    body.appendChild(emptyNote('No listings match. New wares arrive as cultivators post them.'));
    return;
  }
  const list = document.createElement('div');
  list.className = 'pav-list';
  const now = Date.now();
  for (const l of listings) {
    const row = document.createElement('div');
    row.className = 'pav-row';
    const seller = personaById(l.sellerPersonaId);
    const info = document.createElement('div');
    info.className = 'pav-info';
    const isMerit = l.currency === 'merit';
    const unit = isMerit ? '✧' : '◆';
    const fair = marketValue(l.item, isMerit ? 'merit' : 'stones');
    const deal = l.price <= fair * 0.85 ? '<span class="pav-deal">bargain</span>' : l.price >= fair * 1.25 ? '<span class="pav-pricey">steep</span>' : '';
    const meritTag = isMerit ? ' <span class="pav-merit-tag">Merit</span>' : '';
    info.innerHTML = `<div class="pav-name rarity-${l.item.rarity}">${l.item.name} <span class="dim">Lv ${l.item.level} ${l.item.slot}</span>${meritTag}</div>
      <div class="pav-sub dim">${personaLabel(seller)}</div>
      <div class="pav-price">${l.price} ${unit} ${deal} <span class="dim">· ${fmtLeft(l.expiresAt - now)}</span></div>`;
    const buy = document.createElement('button');
    buy.type = 'button';
    buy.className = 'pav-buy-btn';
    buy.textContent = 'Buy';
    const balance = isMerit ? (state.player.merit ?? 0) : state.player.spiritStones;
    const label = isMerit ? 'Merit ✧' : 'spirit stones ◆';
    if (balance < l.price) {
      buy.disabled = true;
      buy.title = `Not enough ${label} — this costs ${l.price} ${unit}, you have ${balance} ${unit}.`;
    } else {
      buy.title = `Buy Now for ${l.price} ${label}.`;
    }
    buy.addEventListener('click', () => { hideTip(); actions.buy(l.id); afterPavAction(); });
    row.append(pavItemIcon(l.item), info, buy);
    list.appendChild(row);
  }
  body.appendChild(list);
}

function renderSellTab(body) {
  const { state, actions } = pav;
  body.appendChild(emptyNote('List an artifact from your pack for spirit stones ◆ or Merit ✧. Price below its fair value to sell faster; overprice it and it may sit unsold. Proceeds arrive in your mailbox.'));
  const inv = state.player.inventory;
  if (inv.length === 0) {
    body.appendChild(emptyNote('Your pack is empty — nothing to sell.'));
    return;
  }
  const list = document.createElement('div');
  list.className = 'pav-list';
  for (const item of inv) {
    const row = document.createElement('div');
    row.className = 'pav-row';
    const info = document.createElement('div');
    info.className = 'pav-info';
    const sub = document.createElement('div');
    sub.className = 'pav-sub dim';
    const nameLine = document.createElement('div');
    nameLine.className = `pav-name rarity-${item.rarity}`;
    nameLine.innerHTML = `${item.name} <span class="dim">Lv ${item.level} ${item.slot}</span>`;
    info.append(nameLine, sub);

    const price = document.createElement('input');
    price.type = 'number';
    price.className = 'pav-price-input';
    price.min = '1';

    // Currency selector (Wave 3 dual-currency, doc 20 §4.7): stones or Merit.
    // Changing it re-prices the fair-value default and the sub label.
    const currency = selectControl('Currency', 'stones', [['stones', 'Stones ◆'], ['merit', 'Merit ✧']], (v) => sync(v));
    const currencySel = currency.querySelector('select');

    const sync = (cur) => {
      const unit = cur === 'merit' ? '✧' : '◆';
      const fair = marketValue(item, cur);
      sub.textContent = `Fair value ≈ ${fair} ${unit} · vendor ${sellValue(item)} ◆`;
      price.value = String(fair);
      price.title = `Asking price in ${cur === 'merit' ? 'Merit ✧' : 'spirit stones ◆'} — fair value ≈${fair} ${unit}. Price low to sell fast, high and it may sit unsold.`;
    };
    sync('stones');

    const listBtn = document.createElement('button');
    listBtn.type = 'button';
    listBtn.className = 'pav-list-btn';
    listBtn.textContent = 'List';
    listBtn.title = 'List this item at the Pavilion — it is held in escrow until it sells or you reclaim it; proceeds land in your Mailbox.';
    listBtn.addEventListener('click', () => {
      const p = parseInt(price.value, 10);
      actions.list(item.id, p, currencySel.value);
      afterPavAction();
    });
    row.append(pavItemIcon(item), info, currency, price, listBtn);
    list.appendChild(row);
  }
  body.appendChild(list);
}

function renderMineTab(body) {
  const { state, actions } = pav;
  const listings = marketPlayerListings(state);
  if (listings.length === 0) {
    body.appendChild(emptyNote('You have no active listings. Post gear from the Sell tab.'));
    return;
  }
  const now = Date.now();
  const list = document.createElement('div');
  list.className = 'pav-list';
  for (const l of listings) {
    const row = document.createElement('div');
    row.className = 'pav-row';
    const info = document.createElement('div');
    info.className = 'pav-info';
    info.innerHTML = `<div class="pav-name rarity-${l.item.rarity}">${l.item.name} <span class="dim">Lv ${l.item.level} ${l.item.slot}</span></div>
      <div class="pav-sub dim">Asking ${l.price} ◆ · fair ≈ ${l.value ?? marketValue(l.item)} ◆</div>
      <div class="pav-price dim">Awaiting a buyer · ${fmtLeft(l.expiresAt - now)}</div>`;
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.textContent = 'Reclaim';
    cancel.title = 'Cancel this listing and take the item back — no sale happens.';
    cancel.addEventListener('click', () => { actions.cancel(l.id); afterPavAction(); });
    row.append(pavItemIcon(l.item), info, cancel);
    list.appendChild(row);
  }
  body.appendChild(list);
}

function renderMailboxTab(body) {
  const { state, actions } = pav;
  const mail = marketMailbox(state);
  const collectAll = document.createElement('button');
  collectAll.type = 'button';
  collectAll.className = 'claim-btn';
  collectAll.textContent = 'Collect all';
  collectAll.disabled = mail.length === 0;
  collectAll.title = mail.length === 0 ? 'Your mailbox is empty.' : `Collect all ${mail.length} item${mail.length === 1 ? '' : 's'} and stones from your mailbox into your pack.`;
  collectAll.addEventListener('click', () => { actions.collect(); afterPavAction(); });
  body.appendChild(collectAll);

  if (mail.length === 0) {
    body.appendChild(emptyNote('Your mailbox is empty. Sale proceeds and unsold returns land here.'));
    return;
  }
  const list = document.createElement('div');
  list.className = 'pav-list';
  for (const e of mail) {
    const row = document.createElement('div');
    row.className = 'pav-row mail-row';
    if (e.kind === 'sale') {
      const isMerit = e.currency === 'merit';
      const glyph = isMerit ? '✧' : '◆';
      const unitLabel = isMerit ? 'Merit' : 'spirit stones';
      row.innerHTML = `<span class="mail-glyph">${glyph}</span><div class="pav-info"><div class="pav-name">Sold <span class="rarity-${e.rarity}">${e.itemName}</span></div><div class="pav-sub dim">to ${e.buyerName} · +${e.stones} ${unitLabel}</div></div>`;
    } else {
      const item = e.item;
      const label = e.kind === 'return' ? 'Returned (unsold)' : 'Purchased';
      row.innerHTML = `<span class="mail-glyph rarity-${item.rarity}">${SLOT_ICONS[item.slot]}</span><div class="pav-info"><div class="pav-name rarity-${item.rarity}">${item.name}</div><div class="pav-sub dim">${label} · Lv ${item.level} ${item.slot}</div></div>`;
    }
    list.appendChild(row);
  }
  body.appendChild(list);
}

function renderPavilionBody() {
  const body = $('pavilion-body');
  body.innerHTML = '';
  if (pavTab === 'buy') renderBuyTab(body);
  else if (pavTab === 'sell') renderSellTab(body);
  else if (pavTab === 'mine') renderMineTab(body);
  else renderMailboxTab(body);
}

function renderPavilionChrome() {
  const { state } = pav;
  $('pavilion-stones').textContent = `— ◆ ${state.player.spiritStones}`;
  document.querySelectorAll('.pav-tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === pavTab));
  updatePavilionBadge(state);
}

function renderPavilion() {
  renderPavilionChrome();
  renderPavilionBody();
}

// Re-render the modal after an action (the action already refreshed the HUD).
function afterPavAction() {
  renderPavilion();
}

// Mailbox count badge on the Pavilion button + the Mailbox tab.
export function updatePavilionBadge(state) {
  const n = marketMailbox(state).length;
  for (const id of ['pavilion-mail-count', 'pav-mail-badge']) {
    const el = $(id);
    if (!el) continue;
    el.textContent = String(n);
    el.classList.toggle('hidden', n === 0);
  }
}

export function initPavilion(state, actions) {
  pav = { state, actions };
  const overlay = $('pavilion-overlay');
  $('btn-pavilion').addEventListener('click', () => {
    pavTab = 'buy';
    renderPavilion();
    overlay.classList.remove('hidden');
  });
  $('btn-close-pavilion').addEventListener('click', () => overlay.classList.add('hidden'));
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.add('hidden');
  });
  for (const btn of document.querySelectorAll('.pav-tab')) {
    btn.addEventListener('click', () => {
      pavTab = btn.dataset.tab;
      renderPavilion();
    });
  }
  updatePavilionBadge(state);
}

// --- Sect / Warband (GDD §4.3). A modal listing your hired disciples (with
// dismiss) and a recruit board (hire for spirit stones). Each disciple grants a
// passive economy buff scaled by their level; the header sums the active total.

let sect = null; // { state, actions }

const GUILD_BUFF_LABELS = {
  xpPct: (v) => `+${Math.round(v * 100)}% battle XP`,
  stonePct: (v) => `+${Math.round(v * 100)}% battle spirit stones`,
  stonesPerHour: (v) => `+${v} spirit stones/hr`,
  qiCap: (v) => `+${v} max Qi`,
};

function guildBuffSummaryChips(buffs) {
  const parts = [];
  for (const [k, v] of Object.entries(buffs)) if (v) parts.push(GUILD_BUFF_LABELS[k](v));
  return parts;
}

function discipleRow(view, { actionLabel, onAction, actionCls = '' }) {
  const row = document.createElement('div');
  row.className = 'sect-row';
  const spec = view.specialty;
  const info = document.createElement('div');
  info.className = 'sect-info';
  info.innerHTML = `<div class="sect-name">${view.persona.name} <span class="dim">[${view.persona.guildTag}] · Lv ${view.persona.level}</span></div>
    <div class="sect-role cat-${spec.id}">${spec.icon} ${spec.name} — <span class="sect-buff">${view.buffText}</span></div>
    <div class="sect-desc dim">${spec.desc}</div>`;
  info.title = `${spec.name} disciple — a permanent, always-on buff while hired: ${view.buffText}.`;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = actionCls;
  btn.textContent = actionLabel;
  if (view.disabled) {
    btn.disabled = true;
    if (view.disabledReason) btn.title = view.disabledReason;
  } else {
    btn.title = actionLabel.startsWith('Recruit')
      ? `Hire ${view.persona.name} for spirit stones ◆ — grants ${view.buffText}.`
      : `Dismiss ${view.persona.name} from your sect — free, but you lose their ${view.buffText} buff.`;
  }
  btn.addEventListener('click', () => onAction(view.personaId));
  row.append(info, btn);
  return row;
}

export function renderSect(state) {
  const members = guildMembers(state);
  const recruits = guildRecruits(state);
  const buffs = guildBuffSummary(state);

  $('sect-count').textContent = `— ${members.length}/${SECT_CAPACITY} disciples`;
  $('sect-count').title = `Your sect holds ${members.length} of a maximum ${SECT_CAPACITY} disciples.`;

  const summary = $('sect-summary');
  const chips = guildBuffSummaryChips(buffs);
  summary.innerHTML = chips.length
    ? `<span class="codex-summary-label">Active sect buffs:</span> ${chips.map((c) => `<span class="card-bonus-chip">${c}</span>`).join(' ')}`
    : '<span class="empty-note">No disciples yet. Recruit fellow cultivators below for always-on buffs.</span>';
  summary.title = 'Combined passive buffs from every hired disciple — always on while they remain in your sect.';

  const body = $('sect-body');
  body.innerHTML = '';

  const memHead = document.createElement('h3');
  memHead.textContent = 'Your Disciples';
  body.appendChild(memHead);
  if (members.length === 0) {
    const p = document.createElement('p');
    p.className = 'empty-note';
    p.textContent = 'Your sect halls stand empty.';
    body.appendChild(p);
  } else {
    for (const m of members) {
      body.appendChild(discipleRow(m, { actionLabel: 'Dismiss', actionCls: 'danger-btn', onAction: (id) => { sect.actions.dismiss(id); renderSect(state); } }));
    }
  }

  const recHead = document.createElement('h3');
  recHead.textContent = 'Disciples Seeking a Sect';
  body.appendChild(recHead);
  const full = members.length >= SECT_CAPACITY;
  for (const r of recruits) {
    r.disabled = full || state.player.spiritStones < r.cost;
    r.disabledReason = full ? 'Sect is full' : state.player.spiritStones < r.cost ? 'Not enough spirit stones' : '';
    body.appendChild(discipleRow(r, { actionLabel: `Recruit · ${r.cost} ◆`, actionCls: 'claim-btn', onAction: (id) => { sect.actions.hire(id); renderSect(state); } }));
  }
}

export function initSect(state, actions) {
  sect = { state, actions };
  const overlay = $('sect-overlay');
  $('btn-sect').addEventListener('click', () => {
    renderSect(state);
    overlay.classList.remove('hidden');
  });
  $('btn-close-sect').addEventListener('click', () => overlay.classList.add('hidden'));
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.add('hidden');
  });
}
