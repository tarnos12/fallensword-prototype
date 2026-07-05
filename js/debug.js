// =====================================================================
// TESTING ONLY — debug panel (strip before demo). Delete this file, remove
// its import + initDebug() call in main.js, and remove the debug block in
// game.js (plus setDropMultiplier/setCardDropMultiplier in items.js/cards.js)
// to fully strip the debug tooling.
//
// A single self-contained panel that exercises every system without grinding:
// spawn any creature, crank drop/card rates, grant resources & breakthroughs,
// mint gear of any rarity, fill the codex, drive the market. It builds its own
// DOM (so index.html needs no markup) and calls the passed rerender after each
// action.
// =====================================================================

import {
  setGodMode,
  isGodMode,
  debugSpawn,
  debugClearTile,
  debugGrant,
  debugGiveItem,
  debugCards,
  debugRevealCodex,
  debugMarket,
} from './game.js';
import { CREATURE_TYPES } from './actors.js';
import { RARITIES, setDropMultiplier } from './items.js';
import { setCardDropMultiplier } from './cards.js';

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v;
    else node.setAttribute(k, v);
  }
  for (const c of children) node.appendChild(c);
  return node;
}

function select(options, onChange, value) {
  const sel = el('select', { class: 'dbg-select' });
  for (const [val, label] of options) {
    const opt = el('option', { value: val, text: label });
    if (val === value) opt.selected = true;
    sel.appendChild(opt);
  }
  sel.addEventListener('change', () => onChange(sel.value));
  return sel;
}

function button(label, onClick, cls = '') {
  const b = el('button', { type: 'button', class: `dbg-btn ${cls}`, text: label });
  b.addEventListener('click', onClick);
  return b;
}

function numInput(value, width = '46px') {
  const i = el('input', { type: 'number', min: '1', value: String(value), class: 'dbg-num' });
  i.style.width = width;
  return i;
}

function row(label, ...controls) {
  return el('div', { class: 'dbg-row' }, [el('span', { class: 'dbg-label', text: label }), ...controls]);
}

export function initDebug(state, rerender) {
  const act = (fn) => () => {
    fn();
    rerender();
  };

  const box = el('div', { class: 'panel-box debug-box' });
  box.appendChild(el('h2', { text: '🛠 Debug — testing only' }));

  // God mode
  const god = el('input', { type: 'checkbox' });
  god.checked = isGodMode();
  god.addEventListener('change', () => {
    setGodMode(god.checked);
    rerender();
  });
  const godLabel = el('label', { class: 'dbg-check' }, [god, el('span', { text: ' God mode (one-shot, never die)' })]);
  box.appendChild(godLabel);

  // Drop-rate multipliers
  box.appendChild(
    row(
      'Item drops',
      select([['1', '1×'], ['3', '3×'], ['10', '10×'], ['100', 'Always']], (v) => setDropMultiplier(parseFloat(v)), '1')
    )
  );
  box.appendChild(
    row(
      'Card drops',
      select([['1', '1×'], ['5', '5×'], ['25', '25×'], ['100', 'Always']], (v) => setCardDropMultiplier(parseFloat(v)), '1')
    )
  );

  // Spawn a creature on the current tile
  const creatureSel = select(
    Object.entries(CREATURE_TYPES).map(([id, t]) => [id, t.name]),
    () => {},
    'wolfSpirit'
  );
  const spawnLvl = numInput(1);
  box.appendChild(
    row(
      'Spawn',
      creatureSel,
      el('span', { class: 'dbg-mini', text: 'Lv' }),
      spawnLvl,
      button('Spawn', act(() => debugSpawn(state, creatureSel.value, parseInt(spawnLvl.value, 10)))),
      button('Clear tile', act(() => debugClearTile(state)))
    )
  );

  // Mint gear of any rarity/slot/level
  const gearSlot = select([['weapon', 'Weapon'], ['robe', 'Robe']], () => {}, 'weapon');
  const gearRarity = select(
    Object.keys(RARITIES).map((k) => [k, RARITIES[k].label]),
    () => {},
    'epic'
  );
  const gearLvl = numInput(6);
  box.appendChild(
    row(
      'Gear',
      gearSlot,
      gearRarity,
      el('span', { class: 'dbg-mini', text: 'Lv' }),
      gearLvl,
      button('Give', act(() => debugGiveItem(state, gearSlot.value, gearRarity.value, parseInt(gearLvl.value, 10))))
    )
  );

  // Resource grants
  box.appendChild(
    el('div', { class: 'dbg-btns' }, [
      button('+5000 ◆', act(() => debugGrant(state, 'stones'))),
      button('+500 XP', act(() => debugGrant(state, 'xp'))),
      button('Breakthrough', act(() => debugGrant(state, 'breakthrough'))),
      button('+5 stat', act(() => debugGrant(state, 'statpts'))),
      button('+5 tech', act(() => debugGrant(state, 'techpts'))),
      button('Refill Qi', act(() => debugGrant(state, 'qi'))),
    ])
  );

  // Cards + codex + market
  box.appendChild(
    el('div', { class: 'dbg-btns' }, [
      button('Grant all cards', act(() => debugCards(state, 'all'))),
      button('Max all cards', act(() => debugCards(state, 'max'))),
      button('Clear cards', act(() => debugCards(state, 'clear'))),
      button('Reveal codex', act(() => debugRevealCodex(state))),
      button('Rotate market', act(() => debugMarket(state, 'refresh'))),
      button('Resolve listings', act(() => debugMarket(state, 'resolve'))),
    ])
  );

  const charPanel = document.getElementById('char-panel');
  charPanel.appendChild(box);
}
