// Rendering + combat playback. Reads game state, never mutates it except
// through the action functions passed in from main.js.

import { ZONES, portalAt } from './map.js';
import { MAX_QI, effectiveStats, stageName, totalRepairCost } from './game.js';
import { MAX_TURNS } from './combat.js';
import { xpForBreakthrough, ALLOC_STATS, POINT_VALUE, MAX_STAGE } from './progression.js';
import { sellValue, RARITIES, INVENTORY_SIZE } from './items.js';
import { currentQuest, progressText, QUESTS } from './quests.js';
import { TECHNIQUES, CATEGORIES, get as getTech, isLearned, canLearn, canCast, activeBuffs } from './techniques.js';

const $ = (id) => document.getElementById(id);

export function renderPlayerBar(state) {
  const p = state.player;
  const eff = effectiveStats(p);
  const need = xpForBreakthrough(p.level);
  $('chip-level').textContent = stageName(p.level);
  $('chip-xp').textContent = p.level >= MAX_STAGE ? `XP ${p.xp} (peak)` : `XP ${p.xp}/${need}`;
  $('chip-points').textContent = `✦ ${p.statPoints} pts`;
  $('chip-points').classList.toggle('attention', p.statPoints > 0);
  $('chip-stones').textContent = `◆ ${p.spiritStones}`;
  $('chip-hp').textContent = `HP ${eff.maxHp}`;
  $('chip-qi').textContent = `Qi ${state.qi}/${MAX_QI}`;
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
      if (here) el.classList.add('player-here');
      if (tile.isStart) el.classList.add('start-tile');
      if (portal) el.classList.add('portal-tile');
      el.innerHTML =
        (here ? '<span class="player-marker">☯</span>' : '') +
        (portal ? '<span class="portal-marker">⟠</span>' : '') +
        (tile.monsters.length > 0
          ? `<span class="monster-dots">${'●'.repeat(tile.monsters.length)}</span>`
          : '');
      const portalNote = portal ? `, portal to ${ZONES[portal.to].name}` : '';
      el.title = `(${x},${y}) — danger band ${tile.band}${tile.monsters.length ? `, ${tile.monsters.length} creature(s)` : ''}${portalNote}`;
      el.addEventListener('click', () => onTileClick(x, y));
      grid.appendChild(el);
    }
  }
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

  if (tile.monsters.length === 0) {
    const p = document.createElement('p');
    p.className = 'empty-note';
    p.textContent = tile.isStart
      ? 'A place of safety. Nothing hunts you here.'
      : 'Nothing stirs here. Cleared tiles repopulate after a while.';
    list.appendChild(p);
    return;
  }

  for (const m of tile.monsters) {
    const row = document.createElement('div');
    row.className = 'monster-row';

    const label = document.createElement('span');
    label.className = 'monster-name';
    label.textContent = `${m.name} (Lv ${m.level})`;

    const inspect = document.createElement('button');
    inspect.type = 'button';
    inspect.textContent = '👁';
    inspect.title = 'Inspect before you commit Qi';
    inspect.addEventListener('click', () => onInspect(m, row));

    const atk = document.createElement('button');
    atk.type = 'button';
    atk.className = 'attack-btn';
    atk.textContent = 'Attack';
    if (!canAttack()) {
      atk.disabled = true;
      atk.title = `Need ${MAX_TURNS} Qi to attack`;
    }
    atk.addEventListener('click', () => onAttack(m.id));

    row.append(label, inspect, atk);
    list.appendChild(row);
  }
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

  const grid = document.createElement('div');
  grid.className = 'stat-grid';
  for (const stat of ALLOC_STATS) {
    const effKey = stat === 'hp' ? 'maxHp' : stat;
    const trained = p.allocated[stat] * POINT_VALUE[stat];
    const gearPart = eff[effKey] - p.base[effKey] - trained;
    const cell = document.createElement('div');
    cell.className = 'stat-cell';
    cell.innerHTML = `<span class="stat-label">${STAT_LABELS[stat]}</span><span class="stat-value">${eff[effKey]}</span>`;
    attachTooltip(
      cell,
      () =>
        `<div class="tt-name">${STAT_LABELS[stat]}: ${eff[effKey]}</div>
         <div class="tt-line">${p.base[effKey]} base + ${trained} trained + ${gearPart} gear</div>`
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
    <div class="tt-hint">${hint}</div>`;
}

function makeItemSlot(item, { label, onClick, onMenu, tooltipHint }) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'item-slot';
  if (item) {
    el.classList.add(`icon-${item.rarity}`);
    const pct = Math.round((item.durability / item.maxDurability) * 100);
    const durClass = item.durability <= 0 ? 'broken' : pct < 25 ? 'low' : '';
    el.innerHTML = `<span class="item-icon">${SLOT_ICONS[item.slot]}</span>
      <span class="dur-bar"><span class="dur-fill ${durClass}" style="width:${Math.max(4, pct)}%"></span></span>`;
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

export function renderGear(state, { onEquip, onUnequip, onSell, onDestroy, atGate }) {
  const p = state.player;
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

  $('pack-count').textContent = `${p.inventory.length}/${INVENTORY_SIZE}`;
  const inv = $('inventory-list');
  inv.innerHTML = '';
  for (let i = 0; i < INVENTORY_SIZE; i++) {
    const item = p.inventory[i];
    if (!item) {
      inv.appendChild(makeItemSlot(null, {}));
      continue;
    }
    inv.appendChild(
      makeItemSlot(item, {
        tooltipHint: atGate ? 'Click: equip · Right-click: sell / destroy' : 'Click: equip · Right-click: destroy (sell at Sect Gate)',
        onClick: () => onEquip(item.id),
        onMenu: (e) =>
          openMenu(e, [
            { label: 'Equip', onClick: () => onEquip(item.id) },
            {
              label: `Sell for ${sellValue(item)} ◆`,
              disabled: !atGate,
              onClick: () => onSell(item.id),
            },
            {
              label: 'Destroy',
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
    btn.addEventListener('click', onClaim);
    box.appendChild(btn);
  }
}

// --- Techniques: learn (banked points) + cast (Qi) + active buff readout ---

const EFFECT_LABELS = { attack: 'Attack', defense: 'Defense', damage: 'Damage', armor: 'Armor', hp: 'Max HP' };

function effectText(effect) {
  return Object.entries(effect)
    .map(([s, v]) => `${v > 0 ? '+' : ''}${Math.round(v * 100)}% ${EFFECT_LABELS[s] ?? s}`)
    .join(', ');
}

export function renderActiveBuffs(state, now = Date.now()) {
  const box = $('active-buffs');
  const buffs = activeBuffs(state.player, now);
  box.innerHTML = '';
  if (buffs.length === 0) {
    box.innerHTML = '<p class="empty-note">No techniques active. Channel one before a hard fight.</p>';
    return;
  }
  for (const b of buffs) {
    const t = getTech(b.techniqueId);
    const secs = Math.max(0, Math.ceil((b.expiresAt - now) / 1000));
    const row = document.createElement('div');
    row.className = 'buff-row';
    row.innerHTML = `<span class="buff-name cat-${t.category.toLowerCase()}">${t.name}</span>
      <span class="buff-eff dim">${effectText(t.effect)}</span>
      <span class="buff-time">${secs}s</span>`;
    box.appendChild(row);
  }
}

export function renderTechniques(state, { onLearn, onCast }) {
  const p = state.player;
  const list = $('tech-list');
  list.innerHTML = '';

  const head = document.createElement('p');
  head.className = 'empty-note';
  head.textContent = `Technique points: ${p.skillPoints}. Learn once, then channel (costs Qi) for a timed buff.`;
  list.appendChild(head);

  for (const cat of CATEGORIES) {
    const catHead = document.createElement('h3');
    catHead.className = `cat-${cat.toLowerCase()}`;
    catHead.textContent = cat;
    list.appendChild(catHead);

    for (const t of Object.values(TECHNIQUES).filter((x) => x.category === cat)) {
      const learned = isLearned(p, t.id);
      const row = document.createElement('div');
      row.className = 'tech-row';
      if (learned) row.classList.add('learned');

      const info = document.createElement('div');
      info.className = 'tech-info';
      info.innerHTML = `<span class="tech-name">${t.name}</span>
        <span class="tech-desc dim">${t.desc}</span>
        <span class="tech-meta dim">Qi ${t.qiCost} · ${Math.round(t.duration / 1000)}s · needs stage ${t.minStage}${t.prereqs.length ? ` · after ${t.prereqs.map((pr) => getTech(pr).name).join(', ')}` : ''}</span>`;
      row.appendChild(info);

      const btn = document.createElement('button');
      btn.type = 'button';
      if (!learned) {
        const chk = canLearn(p, t.id);
        btn.textContent = `Learn (${t.cost}✦)`;
        btn.disabled = !chk.ok;
        if (!chk.ok && chk.reason) btn.title = chk.reason;
        btn.addEventListener('click', () => onLearn(t.id));
      } else {
        const chk = canCast(p, state.qi, t.id);
        btn.textContent = 'Channel';
        btn.className = 'cast-btn';
        btn.disabled = !chk.ok;
        if (!chk.ok && chk.reason) btn.title = chk.reason;
        btn.addEventListener('click', () => onCast(t.id));
      }
      row.appendChild(btn);
      list.appendChild(row);
    }
  }
}

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

  const lines = result.turns.map((t) => turnLine(t, result.monster));

  let i = 0;
  const showNext = () => {
    if (i >= lines.length) {
      finish();
      return;
    }
    log.insertAdjacentHTML('beforeend', lines[i]);
    log.scrollTop = log.scrollHeight;
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

function outcomeBanner(result) {
  if (result.outcome === 'win') {
    const r = result.rewards;
    const drop = r.itemDrop ? `, looted <span class="rarity-${r.itemDrop.rarity}">${r.itemDrop.name}</span>` : '';
    return `<div class="banner win">VICTORY — +${r.xp} XP, +${r.stones} spirit stones${drop} <span class="dim">(${result.staminaSpent} Qi spent)</span></div>`;
  }
  if (result.outcome === 'loss') {
    const p = result.penalty;
    return `<div class="banner loss">DEFEAT — lost ${p.stonesLost} stones, ${p.xpLost} XP <span class="dim">(${result.staminaSpent} Qi spent)</span></div>`;
  }
  return `<div class="banner draw">UNRESOLVED — ${MAX_TURNS} turns passed; this foe is beyond you for now <span class="dim">(${result.staminaSpent} Qi spent)</span></div>`;
}
