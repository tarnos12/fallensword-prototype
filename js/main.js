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
  tickPlaytime,
  brewPill,
  usePill,
  tickPillBuffs,
  startSectMission,
  tickSectMissions,
  collectSectMissions,
  ascend,
  salvageItemAction,
  essenceRepairAction,
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
import { initSalvage, renderSalvage } from './salvage.js';
import { initBounties, renderBounties, updateBountyBadge } from './bounties.js';
import { initSectMissions, renderSectMissions, updateSectMissionBadge } from './sectmissions.js';
import { initAscension, renderAscension } from './ascension.js';
import { initTrials, renderTrialBadge } from './trials.js';
import { initAlchemy, renderPillBar } from './alchemy.js';
import { initMeridians, allocateMeridian } from './meridians.js';
import { initSockets, slotGem, unslotGem } from './sockets.js';
import { INVENTORY_SIZE } from './items.js';
import { toast, initToasts } from './toast.js';
import { stageName } from './progression.js';
import { recordFight, initReplay, getLastFight, setReplayVisible } from './replay.js';
import { initInput } from './input.js';
import { initTooltips } from './tooltips.js';
import { initTabs, setActiveTab } from './tabs.js';
import { initStats } from './stats.js';
import { initTitles } from './titles.js';
import { initEventBanner, renderEventBanner } from './events.js';

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
    onSalvage: (id) => {
      const r = salvageItemAction(state, id);
      renderSalvage(state); // refresh the essence ledger if the modal is open
      renderAll();
      if (r?.ok) toast(`Salvaged into +${r.qty} ${r.materialName}`, 'success');
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
  updateSectMissionBadge(state);
  showAchievementToasts(unlocked);
  renderTrialBadge(state);
  renderPillBar(state);
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
  if (!res.ok && res.reason.startsWith('Need')) {
    addLog(state, res.reason);
    toast(res.reason, 'warn'); // e.g. "Need 2 Qi to move there"
  }
  renderAll();
}

// Drive combat playback for a result (a fresh fight or a replay of a stored one).
// A replay is purely visual — rewards were already applied when the fight first
// resolved, so this just re-runs the presentation (and the task-W fx layer).
function runPlayback(result, onDone) {
  if (inCombat) return;
  inCombat = true;
  setActiveTab('combat'); // full-view tabs: a fight takes over the Combat screen
  setReplayVisible(false); // hide replay controls during live playback
  renderPlayerBar(state);
  playCombat(state, result, () => {
    inCombat = false;
    setReplayVisible(true); // fight finished — offer replay/share
    renderAll();
    if (onDone) onDone(); // fresh-fight-only side effects (reward toasts); replays pass nothing
  });
}

function onAttack(monsterId) {
  if (inCombat) return;
  const levelBefore = state.player.level;
  const result = attack(state, monsterId);
  if (!result) return;
  recordFight(result); // remember it for replay/share (task T)
  runPlayback(result, () => {
    // Surface the fight's high-signal rewards once the playback finishes.
    // (Only the fresh fight toasts — a replay passes no onDone, so no re-toast.)
    const drop = result.rewards?.itemDrop;
    if (drop) toast(`Loot: ${drop.name} (Lv ${drop.level})`, 'success');
    const card = result.cardDrop;
    if (card && (card.kind === 'new' || card.kind === 'upgrade')) {
      toast(`Spirit Card ${card.kind === 'new' ? 'obtained' : 'refined'}: ${card.card.creatureName} (L${card.level})`, 'success');
    } else if (card && card.kind === 'duplicate') {
      toast(`Duplicate card → +${card.stones} spirit stones`, 'info');
    }
    if (state.player.level > levelBefore) {
      toast(`Breakthrough! ${stageName(state.player.level)}`, 'success');
    }
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
  buy: (id) => {
    const r = marketBuy(state, id);
    renderAll();
    if (r?.ok) toast(`Bought ${r.item.name} for ${r.price} ◆${r.toMailbox ? ' → mailbox' : ''}`, 'success');
    else if (r?.reason) toast(r.reason, 'error'); // e.g. "Not enough spirit stones"
  },
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
initSalvage(state, {
  repair: (id) => {
    const r = essenceRepairAction(state, id);
    renderSalvage(state); renderAll();
    if (r?.ok) toast('Gear mended with spirit essence.', 'success');
    else if (r?.reason === 'essence') toast('Not enough spirit essence.', 'error');
  },
});
initBounties(state, {
  accept: (id) => {
    const r = acceptBounty(state, id);
    renderBounties(state); renderAll();
    if (r?.ok) toast(`Bounty accepted: slay ${r.bounty.target} ${r.bounty.name}`, 'info');
    else if (r?.reason) toast(r.reason, 'error');
  },
  claim: (id) => {
    const r = claimBounty(state, id);
    renderBounties(state); renderAll();
    if (r?.ok) toast(`Bounty claimed: +${r.reward.stones} ◆, +${r.reward.xp} XP`, 'success');
    else if (r?.reason) toast(r.reason, 'error');
  },
});
initSectMissions(state, {
  start: (personaId, typeId) => {
    const r = startSectMission(state, personaId, typeId);
    renderSectMissions(state); renderAll();
    if (r?.ok) toast(`${r.discipleName} dispatched: ${r.typeName} (${r.minutes}m)`, 'info');
    else if (r?.reason) toast(r.reason, 'error');
  },
  collect: () => {
    const r = collectSectMissions(state);
    renderSectMissions(state); renderAll();
    if (r?.count > 0) toast(`Collected ${r.count} disciple reward(s): +${r.stones} ◆, +${r.xp} XP`, 'success');
  },
});
initAscension(state, {
  ascend: () => {
    const r = ascend(state);
    renderAscension(state); renderAll();
    if (r?.ok) toast(`✦ Ascension ${r.ascension} — permanent +${r.bonusPct}% to all stats!`, 'success');
    else if (r?.reason) toast(r.reason, 'warn');
  },
});
initTrials(state, {
  onAttempt: () => { const res = attemptDailyTrial(state); renderAll(); return res; },
});
initAlchemy(state, {
  brew: (id) => { brewPill(state, id); renderAll(); },
  use: (id) => { usePill(state, id); renderAll(); },
});
initMeridians(state, {
  allocate: (id) => {
    if (allocateMeridian(state.player, id).ok) saveGame(state);
    renderAll(); // effective stats now reflect the opened meridian
  },
});
initSockets(state, {
  slot: (itemId, i, gemId) => {
    const r = slotGem(state.player, itemId, i, gemId);
    if (r.ok) { saveGame(state); renderAll(); toast(`Socketed ${r.gem.name}.`, 'success'); }
    else if (r.reason) toast(r.reason, 'error');
  },
  unslot: (itemId, i) => {
    const r = unslotGem(state.player, itemId, i, INVENTORY_SIZE);
    if (r.ok) { saveGame(state); renderAll(); toast(`Removed ${r.gem.name}.`); }
    else if (r.reason) toast(r.reason, 'error');
  },
});
initToasts(); // unified toast/feedback host (task X)
initTooltips(); // global instant-tooltip engine — styled hover tips over native title="" (slice T1)
initTabs(); // full-view tab shell — wire the tab bar (markup lives in index.html)
// Leaving combat via "Continue" returns to the Map screen. addEventListener (not
// onclick) so it coexists with ui.js's own close handler that hides the panel.
document.getElementById('btn-close-combat')?.addEventListener('click', () => setActiveTab('map'));
initReplay(state, { onReplay: (result) => runPlayback(result) });
initStats(state); // 📊 Chronicle of Deeds (lifetime stats)
initTitles(state); // 🏵 Cultivator Titles (read-only cosmetic)
initEventBanner(); // world-events HUD strip under the header (task R)
renderAll();
initTutorial(); // first-run onboarding overlay (+ ❔ Help button); after renderAll so targets exist
initSettings(); // ⚙ settings modal — after initTutorial so its "replay tutorial" can reach ❔ Help
// Keyboard & accessibility (task L). Last, so every modal (incl. runtime-injected
// ones + the tutorial overlay) exists for the ARIA pass. Movement reuses onTileClick.
initInput({ move: (dx, dy) => onTileClick(state.pos.x + dx, state.pos.y + dy) });

// Wall-clock Qi regen + passive spirit-stone income + technique-buff tick
// (once per second).
setInterval(() => {
  tickPlaytime(state); // accrue active playtime for the Chronicle (task S3)
  renderEventBanner(); // refresh the world-event HUD countdown (task R)
  const qiBefore = state.qi;
  tickQi(state);
  const stonesGained = tickStones(state); // spirit-stones/hour Spirit Cards
  const market = tickMarket(state); // rotate Pavilion listings + resolve sales
  const sect = tickSectMissions(state); // resolve finished disciple missions (wall-clock)
  const buffExpired = tickBuffs(state);
  const pillExpired = tickPillBuffs(state); // expire timed Alchemy pill buffs (task C)
  renderPillBar(state); // keep the pill-buff countdown ticking every second
  const qiChanged = state.qi !== qiBefore;
  const hasBuffs = state.player.activeBuffs.length > 0;

  if (inCombat) {
    if (qiChanged || stonesGained || market.changed) renderPlayerBar(state);
    return;
  }
  if (qiChanged || buffExpired || pillExpired || stonesGained || market.changed || sect.changed) {
    renderAll(); // Qi regen, passive stones, market/sect activity, or a fading buff
  } else if (hasBuffs) {
    refreshLive(); // just tick the countdown + buffed stats
  }
}, 1000);
