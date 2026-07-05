import {
  createGame,
  resetGame,
  tryMove,
  attack,
  canAttack,
  tickQi,
  addLog,
  atHaven,
  travel,
  allocateStat,
  equipItem,
  unequipItem,
  sellItem,
  destroyItem,
  repairAll,
  claimQuest,
  learnTechnique,
  castTechnique,
  tickBuffs,
} from './game.js';
import {
  renderPlayerBar,
  renderMap,
  renderTilePanel,
  renderCharSheet,
  renderGear,
  renderQuests,
  renderTechniques,
  renderActiveBuffs,
  renderEventLog,
  toggleInspect,
  playCombat,
  initCombatSettings,
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

// Handlers hoisted so the per-second live refresh can reuse them without
// rebuilding closures (and without a full renderAll that clobbers tooltips).
const allocHandler = (stat) => {
  allocateStat(state, stat);
  renderAll();
};
const techHandlers = {
  onLearn: (id) => {
    learnTechnique(state, id);
    renderAll();
  },
  onCast: (id) => {
    castTechnique(state, id);
    renderAll();
  },
};

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
    onTravel: (portal) => {
      const res = travel(state, portal);
      if (!res.ok && res.reason) addLog(state, res.reason);
      renderAll();
    },
  });
  renderCharSheet(state, allocHandler);
  renderGear(state, {
    atGate: atHaven(state),
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
  renderTechniques(state, techHandlers);
  renderActiveBuffs(state);
  renderEventLog(state);
}

// Lightweight refresh for the per-second buff countdown: updates only the
// buff-affected panels, leaving the map/gear/tooltips untouched.
function refreshLive() {
  renderPlayerBar(state);
  renderCharSheet(state, allocHandler);
  renderTechniques(state, techHandlers);
  renderActiveBuffs(state);
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

initCombatSettings();
renderAll();

// Wall-clock Qi regen + technique-buff tick (once per second).
setInterval(() => {
  const qiBefore = state.qi;
  tickQi(state);
  const buffExpired = tickBuffs(state);
  const qiChanged = state.qi !== qiBefore;
  const hasBuffs = state.player.activeBuffs.length > 0;

  if (inCombat) {
    if (qiChanged) renderPlayerBar(state);
    return;
  }
  if (qiChanged || buffExpired) {
    renderAll(); // Qi regen or a buff fading changes buttons/stats broadly
  } else if (hasBuffs) {
    refreshLive(); // just tick the countdown + buffed stats
  }
}, 1000);
