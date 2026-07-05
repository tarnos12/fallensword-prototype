// Rendering + combat playback. Reads game state, never mutates it except
// through the action functions passed in from main.js.

import { MAP_SIZE } from './map.js';
import { MAX_QI } from './game.js';
import { MAX_TURNS } from './combat.js';

const $ = (id) => document.getElementById(id);

export function renderPlayerBar(state) {
  const p = state.player;
  $('chip-level').textContent = `Qi Condensation ${p.level}`;
  $('chip-xp').textContent = `XP ${p.xp}`;
  $('chip-stones').textContent = `◆ ${p.spiritStones}`;
  $('chip-hp').textContent = `HP ${p.hp}/${p.maxHp}`;
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

export function renderTilePanel(state, { onInspect, onAttack, canAttack }) {
  const tile = state.map.at(state.pos.x, state.pos.y);
  $('tile-title').textContent = `Location (${tile.x}, ${tile.y})${tile.isStart ? ' — Sect Gate (safe)' : ''}`;
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
    // Dump any remaining lines (skip path).
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
    return `<div class="banner win">VICTORY — +${r.xp} XP, +${r.stones} spirit stones <span class="dim">(${result.staminaSpent} Qi spent)</span></div>`;
  }
  if (result.outcome === 'loss') {
    const p = result.penalty;
    return `<div class="banner loss">DEFEAT — lost ${p.stonesLost} stones, ${p.xpLost} XP <span class="dim">(${result.staminaSpent} Qi spent)</span></div>`;
  }
  return `<div class="banner draw">UNRESOLVED — ${MAX_TURNS} turns passed; this foe is beyond you for now <span class="dim">(${result.staminaSpent} Qi spent)</span></div>`;
}
