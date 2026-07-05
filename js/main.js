import {
  createGame,
  resetGame,
  tryMove,
  attack,
  canAttack,
  tickQi,
  addLog,
  atSectGate,
  allocateStat,
  equipItem,
  unequipItem,
  sellItem,
  destroyItem,
  repairAll,
  claimQuest,
} from './game.js';
import {
  renderPlayerBar,
  renderMap,
  renderTilePanel,
  renderCharSheet,
  renderGear,
  renderQuests,
  renderEventLog,
  toggleInspect,
  playCombat,
} from './ui.js';

const state = createGame();
let inCombat = false;

if (state.loadedFromSave) {
  addLog(
    state,
    state.offlineQi > 0
      ? `Welcome back. Passive cultivation restored ${state.offlineQi} Qi while you were away.`
      : 'Welcome back.'
  );
}

function renderAll() {
  renderPlayerBar(state);
  renderMap(state, onTileClick);
  renderTilePanel(state, {
    onInspect: toggleInspect,
    onAttack,
    canAttack: () => canAttack(state) && !inCombat,
    onRepair: () => {
      repairAll(state);
      renderAll();
    },
  });
  renderCharSheet(state, (stat) => {
    allocateStat(state, stat);
    renderAll();
  });
  renderGear(state, {
    atGate: atSectGate(state),
    onEquip: (id) => {
      equipItem(state, id);
      renderAll();
    },
    onUnequip: (slot) => {
      unequipItem(state, slot);
      renderAll();
    },
    onSell: (id) => {
      sellItem(state, id);
      renderAll();
    },
    onDestroy: (id) => {
      destroyItem(state, id);
      renderAll();
    },
  });
  renderQuests(state, () => {
    claimQuest(state);
    renderAll();
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

document.getElementById('btn-reset').addEventListener('click', () => {
  if (confirm('Abandon this life of cultivation? Your save will be wiped.')) {
    resetGame();
    location.reload();
  }
});

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
