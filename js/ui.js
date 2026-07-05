// Rendering + combat playback. Reads game state, never mutates it except
// through the action functions passed in from main.js.

import { MAP_SIZE } from './map.js';
import { MAX_QI, effectiveStats, stageName, totalRepairCost } from './game.js';
import { MAX_TURNS } from './combat.js';
import { xpForBreakthrough, ALLOC_STATS, POINT_VALUE, MAX_STAGE } from './progression.js';
import { repairCost, sellValue, RARITIES } from './items.js';
import { currentQuest, progressText, QUESTS } from './quests.js';

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
  grid.innerHTML = '';
  grid.style.gridTemplateColumns = `repeat(${MAP_SIZE}, 1fr)`;
  for (let y = 0; y < MAP_SIZE; y++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      const tile = state.map.at(x, y);
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `tile band-${tile.band}`;
      el.dataset.x = x;
      el.dataset.y = y;
      const here = state.pos.x === x && state.pos.y === y;
      if (here) el.classList.add('player-here');
      if (tile.isStart) el.classList.add('start-tile');
      el.innerHTML =
        (here ? '<span class="player-marker">☯</span>' : '') +
        (tile.monsters.length > 0
          ? `<span class="monster-dots">${'●'.repeat(tile.monsters.length)}</span>`
          : '');
      el.title = `(${x},${y}) — danger band ${tile.band}${tile.monsters.length ? `, ${tile.monsters.length} creature(s)` : ''}`;
      el.addEventListener('click', () => onTileClick(x, y));
      grid.appendChild(el);
    }
  }
}

export function renderTilePanel(state, { onInspect, onAttack, canAttack, onRepair }) {
  const tile = state.map.at(state.pos.x, state.pos.y);
  $('tile-title').textContent = `Location (${tile.x}, ${tile.y})${tile.isStart ? ' — Sect Gate (safe)' : ''}`;

  // Sect Gate services: location actions come before monsters (GDD §6.6).
  const gate = $('gate-actions');
  gate.innerHTML = '';
  if (tile.isStart) {
    gate.classList.remove('hidden');
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
    note.textContent = 'You may also sell items from your pack while here.';
    gate.appendChild(note);
  } else {
    gate.classList.add('hidden');
  }

  const list = $('monster-list');
  list.innerHTML = '';

  if (tile.monsters.length === 0) {
    const p = document.createElement('p');
    p.className = 'empty-note';
    p.textContent = tile.isStart
      ? 'The gate of your sect. Nothing hunts you here.'
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

// --- Character sheet with stat allocation ---

const STAT_LABELS = { attack: 'Attack', defense: 'Defense', damage: 'Damage', armor: 'Armor', hp: 'Max HP' };

export function renderCharSheet(state, onAllocate) {
  const p = state.player;
  const eff = effectiveStats(p);
  const box = $('char-stats');
  box.innerHTML = '';

  for (const stat of ALLOC_STATS) {
    const effKey = stat === 'hp' ? 'maxHp' : stat;
    const baseKey = stat === 'hp' ? 'maxHp' : stat;
    const row = document.createElement('div');
    row.className = 'stat-row';
    const gearPart = eff[effKey] - p.base[baseKey] - p.allocated[stat] * POINT_VALUE[stat];
    row.innerHTML = `<span class="stat-label">${STAT_LABELS[stat]}</span>
      <span class="stat-value">${eff[effKey]}</span>
      <span class="stat-breakdown dim">${p.base[baseKey]} base + ${p.allocated[stat] * POINT_VALUE[stat]} trained + ${gearPart} gear</span>`;
    if (p.statPoints > 0) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'alloc-btn';
      btn.textContent = `+${POINT_VALUE[stat]}`;
      btn.title = `Spend 1 point: +${POINT_VALUE[stat]} ${STAT_LABELS[stat]}`;
      btn.addEventListener('click', () => onAllocate(stat));
      row.appendChild(btn);
    }
    box.appendChild(row);
  }

  const foot = document.createElement('p');
  foot.className = 'empty-note';
  foot.textContent =
    p.statPoints > 0
      ? `${p.statPoints} stat point(s) to spend.`
      : `Breakthroughs grant ${3} stat points. Technique points banked: ${p.skillPoints} (techniques unlock in Stage 2).`;
  box.appendChild(foot);
}

// --- Equipment + inventory ---

function itemLabel(item) {
  return `<span class="rarity-${item.rarity}">${item.name}</span> <span class="dim">Lv ${item.level}</span>`;
}

function itemStats(item) {
  const parts = Object.entries(item.bonuses).map(([s, v]) => `+${v} ${STAT_LABELS[s] ?? s}`);
  const dur = item.durability <= 0 ? '<span class="broken">BROKEN</span>' : `${item.durability}/${item.maxDurability}`;
  return `${parts.join(', ')} · dur ${dur}`;
}

export function renderGear(state, { onEquip, onUnequip, onSell, onDestroy, atGate }) {
  const p = state.player;
  const slots = $('equipment-slots');
  slots.innerHTML = '';
  for (const slot of ['weapon', 'robe']) {
    const item = p.equipment[slot];
    const row = document.createElement('div');
    row.className = 'item-row';
    if (item) {
      row.innerHTML = `<span class="slot-name">${slot}</span><span class="item-main">${itemLabel(item)}<br><span class="item-stats dim">${itemStats(item)}</span></span>`;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = 'Unequip';
      btn.addEventListener('click', () => onUnequip(slot));
      row.appendChild(btn);
    } else {
      row.innerHTML = `<span class="slot-name">${slot}</span><span class="empty-note">— empty —</span>`;
    }
    slots.appendChild(row);
  }

  $('pack-count').textContent = `${p.inventory.length}/8`;
  const inv = $('inventory-list');
  inv.innerHTML = '';
  if (p.inventory.length === 0) {
    inv.innerHTML = '<p class="empty-note">Your pack is empty. Beasts drop artifacts.</p>';
    return;
  }
  for (const item of p.inventory) {
    const row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = `<span class="item-main">${itemLabel(item)}<br><span class="item-stats dim">${itemStats(item)}</span></span>`;
    const equipBtn = document.createElement('button');
    equipBtn.type = 'button';
    equipBtn.textContent = 'Equip';
    equipBtn.addEventListener('click', () => onEquip(item.id));
    row.appendChild(equipBtn);
    if (atGate) {
      const sellBtn = document.createElement('button');
      sellBtn.type = 'button';
      sellBtn.textContent = `Sell (${sellValue(item)} ◆)`;
      sellBtn.addEventListener('click', () => onSell(item.id));
      row.appendChild(sellBtn);
    }
    const destroyBtn = document.createElement('button');
    destroyBtn.type = 'button';
    destroyBtn.className = 'danger-btn';
    destroyBtn.textContent = '✕';
    destroyBtn.title = 'Destroy (permanent)';
    destroyBtn.addEventListener('click', () => {
      if (confirm(`Destroy ${item.name}? This is permanent.`)) onDestroy(item.id);
    });
    row.appendChild(destroyBtn);
    inv.appendChild(row);
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

  showNext();
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
