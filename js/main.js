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
  tickStones,
  markSeen,
  tickMarket,
  marketBuy,
  marketList,
  marketCancel,
  marketCollect,
  hireDisciple,
  dismissDisciple,
  saveLoadoutAction,
  applyLoadoutAction,
  deleteLoadoutAction,
  checkAchievements,
  forgeReforge,
  forgeUpgrade,
  forgeRepair,
  acceptBounty,
  claimBounty,
  attemptDailyTrial,
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
  initCodex,
  initPavilion,
  updatePavilionBadge,
  initSect,
} from './ui.js';
import { initTutorial } from './tutorial.js';
import { initSettings } from './settings.js';
import { initLoadouts, renderLoadouts } from './loadouts.js';
import { exportSave, importSave, saveGame } from './save.js';
import { initProfile, setSparHandler } from './profile.js';
import { initDuel, openDuel } from './duel.js';
import { initAchievements, updateAchievementBadge, showAchievementToasts } from './achievements.js';
import { initForge } from './crafting.js';
import { initBounties, renderBounties, updateBountyBadge } from './bounties.js';
import { initTrials, renderTrialBadge } from './trials.js';
import { initMeridians, allocateMeridian } from './meridians.js';
import { initDebug } from './debug.js'; // TESTING ONLY (strip before demo)

const state = createGame();
let inCombat = false;

if (state.loadedFromSave) {
  addLog(
    state,
    state.offlineQi > 0
      ? `Welcome back. Passive cultivation restored ${state.offlineQi} Qi while you were away.`
      : 'Welcome back.'
  );
  if (state.offlineStones > 0) {
    addLog(state, `Your Spirit Cards gathered ${state.offlineStones} spirit stones while you were away.`);
  }
  const om = state.offlineMarket;
  if (om && (om.sales.length || om.returns.length)) {
    addLog(state, `While away, the Pavilion resolved ${om.sales.length} sale(s) and returned ${om.returns.length} unsold listing(s) — check your mailbox.`);
  }
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
  // Evaluate milestones first so a fresh unlock's log line renders this pass and
  // its toast fires alongside the UI update (GDD §6.5).
  const unlocked = checkAchievements(state);
  renderPlayerBar(state);
  renderMap(state, onTileClick);
  renderTilePanel(state, {
    onInspect: (m, row) => {
      markSeen(state, m.typeId); // inspecting a beast enters it in the codex (GDD §7.1)
      toggleInspect(m, row);
    },
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
  updatePavilionBadge(state);
  renderLoadouts(state);
  updateAchievementBadge(state);
  updateBountyBadge(state);
  showAchievementToasts(unlocked);
  renderTrialBadge(state);
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

// Backup / Restore modal (save export/import, GDD §4.4).
function initBackup() {
  const overlay = document.getElementById('backup-overlay');
  const exportText = document.getElementById('backup-export-text');
  const importText = document.getElementById('backup-import-text');
  const status = document.getElementById('backup-status');
  const fileInput = document.getElementById('backup-file-input');

  const setStatus = (msg, kind) => {
    status.textContent = msg || '';
    status.className = 'backup-status' + (kind ? ` backup-${kind}` : '');
  };

  const open = () => {
    const blob = exportSave();
    exportText.value = blob ?? '';
    exportText.placeholder = blob ? '' : 'No save to export yet.';
    importText.value = '';
    setStatus('');
    overlay.classList.remove('hidden');
  };
  const close = () => overlay.classList.add('hidden');

  document.getElementById('btn-backup').addEventListener('click', open);
  document.getElementById('btn-close-backup').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  document.getElementById('btn-backup-copy').addEventListener('click', async () => {
    const blob = exportText.value;
    if (!blob) { setStatus('Nothing to copy yet.', 'error'); return; }
    try {
      await navigator.clipboard.writeText(blob);
      setStatus('Backup copied to clipboard.', 'ok');
    } catch {
      // Clipboard API can be blocked (no HTTPS / permissions) — fall back to select.
      exportText.focus();
      exportText.select();
      setStatus('Copy blocked — text selected, press Ctrl/Cmd+C.', 'error');
    }
  });

  document.getElementById('btn-backup-download').addEventListener('click', () => {
    const blob = exportText.value;
    if (!blob) { setStatus('Nothing to download yet.', 'error'); return; }
    const file = new Blob([blob], { type: 'text/plain' });
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fallen-immortal-save.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setStatus('Backup file downloaded.', 'ok');
  });

  const doImport = (raw) => {
    const res = importSave(raw);
    if (!res.ok) { setStatus(res.error, 'error'); return; }
    setStatus('Save restored — reloading…', 'ok');
    setTimeout(() => location.reload(), 600);
  };

  document.getElementById('btn-backup-import').addEventListener('click', () => {
    const raw = importText.value;
    if (!raw.trim()) { setStatus('Paste a backup string first.', 'error'); return; }
    if (!confirm('Restore this save? Your current progress will be replaced.')) return;
    doImport(raw);
  });

  fileInput.addEventListener('change', () => {
    const f = fileInput.files && fileInput.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      importText.value = String(reader.result || '');
      setStatus('File loaded — review, then Restore.', 'ok');
    };
    reader.onerror = () => setStatus('Could not read that file.', 'error');
    reader.readAsText(f);
    fileInput.value = ''; // allow re-selecting the same file
  });
}

initCombatSettings();
initCodex(state);
initPavilion(state, {
  buy: (id) => { marketBuy(state, id); renderAll(); },
  list: (itemId, price) => { marketList(state, itemId, price); renderAll(); },
  cancel: (id) => { marketCancel(state, id); renderAll(); },
  collect: () => { marketCollect(state); renderAll(); },
});
initSect(state, {
  hire: (id) => { hireDisciple(state, id); renderAll(); },
  dismiss: (id) => { dismissDisciple(state, id); renderAll(); },
});
initLoadouts(state, {
  save: (name) => { saveLoadoutAction(state, name); renderAll(); },
  apply: (i) => { applyLoadoutAction(state, i); renderAll(); },
  remove: (i) => { deleteLoadoutAction(state, i); renderAll(); },
});
initBackup();
initProfile(state);
initDuel(state); // sparring / offline PvP-preview modal
setSparHandler((personaId) => openDuel(state, personaId)); // "Spar" on Profile rival rows
initAchievements(state);
initForge(state, {
  reforge: (id) => { forgeReforge(state, id); renderAll(); },
  upgrade: (id) => { forgeUpgrade(state, id); renderAll(); },
  repair: (id) => { forgeRepair(state, id); renderAll(); },
});
initBounties(state, {
  accept: (id) => { acceptBounty(state, id); renderBounties(state); renderAll(); },
  claim: (id) => { claimBounty(state, id); renderBounties(state); renderAll(); },
});
initTrials(state, {
  onAttempt: () => { const res = attemptDailyTrial(state); renderAll(); return res; },
});
initMeridians(state, {
  allocate: (id) => {
    if (allocateMeridian(state.player, id).ok) saveGame(state);
    renderAll(); // effective stats now reflect the opened meridian
  },
});
initDebug(state, renderAll); // TESTING ONLY (strip before demo)
renderAll();
initTutorial(); // first-run onboarding overlay (+ ❔ Help button); after renderAll so targets exist
initSettings(); // ⚙ settings modal — after initTutorial so its "replay tutorial" can reach ❔ Help

// Wall-clock Qi regen + passive spirit-stone income + technique-buff tick
// (once per second).
setInterval(() => {
  const qiBefore = state.qi;
  tickQi(state);
  const stonesGained = tickStones(state); // spirit-stones/hour Spirit Cards
  const market = tickMarket(state); // rotate Pavilion listings + resolve sales
  const buffExpired = tickBuffs(state);
  const qiChanged = state.qi !== qiBefore;
  const hasBuffs = state.player.activeBuffs.length > 0;

  if (inCombat) {
    if (qiChanged || stonesGained || market.changed) renderPlayerBar(state);
    return;
  }
  if (qiChanged || buffExpired || stonesGained || market.changed) {
    renderAll(); // Qi regen, passive stones, market activity, or a fading buff
  } else if (hasBuffs) {
    refreshLive(); // just tick the countdown + buffed stats
  }
}, 1000);
