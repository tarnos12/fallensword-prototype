// Fight replay & share (Stage 3, task T). The combat resolver already produces a
// complete, self-contained `result` (turns[], the foe, outcome, rewards) — so a
// "replay" is just re-running the existing playback over the stored result, and a
// "share" is a plain-text transcript of that same data. Purely presentational and
// additive: it mutates NO game state, owns its own controls (injected into the
// combat panel's button row) and its own export modal, and persists the last
// fight under its own localStorage key (not the save schema). Replaying reuses
// `playCombat` via a callback from main.js, so it inherits the combat-fx layer
// (task W) for free.

const KEY = 'fallen-immortal-lastfight';

let last = null; // the last recorded fight result (in-memory mirror of storage)

// Store only the fields playback + export read, JSON-round-tripped so it survives
// reload and can never hold a live reference into game state.
function snapshot(result) {
  return {
    outcome: result.outcome,
    turns: result.turns,
    staminaSpent: result.staminaSpent,
    monster: result.monster && {
      name: result.monster.name,
      level: result.monster.level,
      maxHp: result.monster.maxHp,
    },
    rewards: result.rewards ?? null,
    penalty: result.penalty ?? null,
    cardDrop: result.cardDrop ?? null,
    bossKill: result.bossKill ?? false,
    at: Date.now(),
  };
}

export function recordFight(result) {
  if (!result || !Array.isArray(result.turns)) return;
  last = JSON.parse(JSON.stringify(snapshot(result)));
  try {
    localStorage.setItem(KEY, JSON.stringify(last));
  } catch {
    /* storage full / unavailable — replay just won't persist across reload */
  }
  syncButtons();
}

export function getLastFight() {
  if (last) return last;
  try {
    last = JSON.parse(localStorage.getItem(KEY));
  } catch {
    last = null;
  }
  return last;
}

export function hasReplay() {
  return !!getLastFight();
}

// A shareable plain-text transcript of a fight (defaults to the last one).
export function exportLog(result = getLastFight()) {
  if (!result) return '';
  const foe = result.monster ? `${result.monster.name} (Lv ${result.monster.level})` : 'a foe';
  const head =
    result.outcome === 'win' ? 'VICTORY' : result.outcome === 'loss' ? 'DEFEAT' : 'UNRESOLVED';
  const lines = [
    'Fallen Immortal — Fight Log',
    `You vs ${foe}`,
    `Result: ${head} · ${result.staminaSpent} Qi spent · ${result.turns.length} turns`,
    '',
  ];
  const foeName = result.monster ? result.monster.name : 'Foe';
  for (const t of result.turns) {
    let line = `T${t.round}: `;
    line += t.attackerSwing
      ? t.attackerSwing.hit
        ? `You hit for ${t.attackerSwing.dmg} (${t.defenderHpAfter} HP left).`
        : 'You miss.'
      : '';
    if (t.defenderHpAfter === 0) {
      line += ` ${foeName} falls!`;
    } else if (t.defenderSwing) {
      line += t.defenderSwing.hit
        ? ` ${foeName} hits for ${t.defenderSwing.dmg} (${t.attackerHpAfter} HP left).`
        : ` ${foeName} misses.`;
      if (t.attackerHpAfter === 0) line += ' You fall!';
    }
    lines.push(line);
  }
  if (result.rewards) {
    const r = result.rewards;
    const drop = r.itemDrop ? `, ${r.itemDrop.name}` : '';
    lines.push('', `Rewards: +${r.xp} XP, +${r.stones} stones${drop}`);
  } else if (result.penalty) {
    lines.push('', `Cost: -${result.penalty.stonesLost} stones, -${result.penalty.xpLost} XP`);
  }
  return lines.join('\n');
}

// =====================================================================
// UI — controls injected into the combat panel + a share/export modal.
// =====================================================================

let onReplayCb = null;
let replayBtn = null;
let exportBtn = null;

export function initReplay(state, handlers) {
  onReplayCb = handlers.onReplay;
  const row = document.querySelector('#combat-panel .combat-buttons');
  if (row) {
    replayBtn = mkButton('btn-replay', '⟳ Replay', () => {
      const r = getLastFight();
      if (r && onReplayCb) onReplayCb(r);
    });
    exportBtn = mkButton('btn-export-log', '⧉ Share log', openExport);
    row.append(replayBtn, exportBtn);
  }
  buildExportModal();
  syncButtons();
}

function mkButton(id, label, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.id = id;
  b.className = 'replay-btn hidden';
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

// main.js drives visibility: hidden during live playback, shown once a fight is
// finished (and a replay therefore exists).
export function setReplayVisible(visible) {
  const show = visible && hasReplay();
  for (const b of [replayBtn, exportBtn]) if (b) b.classList.toggle('hidden', !show);
}

function syncButtons() {
  // Keep enabled-state honest; actual show/hide is main.js's call via setReplayVisible.
  const on = hasReplay();
  for (const b of [replayBtn, exportBtn]) if (b) b.disabled = !on;
}

// --- Export / share modal (own DOM) ---

function buildExportModal() {
  if (document.getElementById('replay-overlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'replay-overlay';
  overlay.className = 'hidden';
  overlay.innerHTML = `
    <div id="replay-panel">
      <div id="replay-header">
        <h2>Share Fight Log</h2>
        <button id="btn-close-replay" type="button" title="Close">✕</button>
      </div>
      <p class="replay-note">Copy this transcript to share your last battle.</p>
      <textarea id="replay-text" readonly rows="12" spellcheck="false"></textarea>
      <div class="replay-actions">
        <button id="btn-copy-log" type="button">Copy to clipboard</button>
      </div>
      <p id="replay-status" class="replay-status"></p>
    </div>`;
  document.body.append(overlay);
  document.getElementById('btn-close-replay').addEventListener('click', closeExport);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeExport(); });
  document.getElementById('btn-copy-log').addEventListener('click', copyLog);
}

function openExport() {
  const overlay = document.getElementById('replay-overlay');
  const ta = document.getElementById('replay-text');
  ta.value = exportLog();
  setStatus('');
  overlay.classList.remove('hidden');
}

function closeExport() {
  document.getElementById('replay-overlay').classList.add('hidden');
}

async function copyLog() {
  const ta = document.getElementById('replay-text');
  if (!ta.value) { setStatus('Nothing to copy.', 'error'); return; }
  try {
    await navigator.clipboard.writeText(ta.value);
    setStatus('Fight log copied to clipboard.', 'ok');
  } catch {
    ta.focus();
    ta.select();
    setStatus('Copy blocked — text selected, press Ctrl/Cmd+C.', 'error');
  }
}

function setStatus(msg, kind) {
  const el = document.getElementById('replay-status');
  if (!el) return;
  el.textContent = msg || '';
  el.className = 'replay-status' + (kind ? ` replay-${kind}` : '');
}
