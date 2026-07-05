import { createGame, tryMove, attack, canAttack, tickQi, addLog } from './game.js';
import {
  renderPlayerBar,
  renderMap,
  renderTilePanel,
  renderEventLog,
  toggleInspect,
  playCombat,
} from './ui.js';

const state = createGame();
let inCombat = false;

function renderAll() {
  renderPlayerBar(state);
  renderMap(state, onTileClick);
  renderTilePanel(state, {
    onInspect: toggleInspect,
    onAttack,
    canAttack: () => canAttack(state) && !inCombat,
  });
  renderEventLog(state);
}

function onTileClick(x, y) {
  if (inCombat) return;
  const res = tryMove(state, x, y);
  if (!res.ok && res.reason.startsWith('Need')) addLog(state, res.reason);
  renderAll();
}

function onAttack(monsterId) {
  if (inCombat) return;
  const result = attack(state, monsterId);
  if (!result) return;
  inCombat = true;
  renderPlayerBar(state);
  playCombat(state, result, () => {
    inCombat = false;
    renderAll();
  });
}

addLog(state, 'You step out from the sect gate. The wilds await.');
renderAll();

// Wall-clock Qi regen tick.
setInterval(() => {
  const before = state.qi;
  tickQi(state);
  if (state.qi !== before) {
    renderPlayerBar(state);
    if (!inCombat) renderAll();
  }
}, 1000);
