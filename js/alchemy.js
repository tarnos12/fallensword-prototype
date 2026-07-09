// Alchemy / consumables (Stage 3, task C, GDD §6.4). Brew pills from spirit
// stones (gated by cultivation level) into a consumables pouch, then quaff them
// for an INSTANT effect (restore Qi / gain insight) or a TIMED combat buff.
//
// Design note on the buff pipeline: technique buffs live on `player.activeBuffs`
// and are rendered by `ui.js` via a technique lookup that would throw on a
// non-technique entry. Rather than reach into that shared renderer (owned by the
// UX sessions), pill combat-buffs live on their own `player.pillBuffs` list and
// are applied at COMBAT time to the combat-actor snapshot — so they boost
// fights without touching `effectiveStats`,
// `ui.js`, or `techniques.js`. The player sees them in a dedicated HUD bar owned
// here. Everything is additive and stays inside this task's files.

const PILL_ICON = '🜁';

// The recipe book. `kind:'instant'` fires immediately; `kind:'buff'` pushes a
// timed percentage buff onto player.pillBuffs. Costs/levels are first-pass and
// will be retuned by the balance sim (task J).
export const PILLS = [
  { id: 'qi_pill', icon: '🫧', name: 'Spirit-Gathering Pill', minLevel: 1, cost: 30,
    kind: 'instant', effect: { qi: 200 }, desc: 'Restores up to 200 Qi at once.' },
  { id: 'xp_pill', icon: '📜', name: 'Enlightenment Pill', minLevel: 1, cost: 90,
    kind: 'instant', effect: { xpPerLevel: 80 }, desc: 'A jolt of insight — gain 80 × your stage in cultivation XP.' },
  { id: 'might_pill', icon: '🔥', name: 'Ashfury Pill', minLevel: 3, cost: 120,
    kind: 'buff', durationMs: 60_000, effect: { attack: 0.25, damage: 0.25 }, desc: '+25% Attack & Damage for 60s of battle.' },
  { id: 'guard_pill', icon: '🛡️', name: 'Ironbark Pill', minLevel: 3, cost: 120,
    kind: 'buff', durationMs: 60_000, effect: { armor: 0.30, defense: 0.20 }, desc: '+30% Armor, +20% Defense for 60s of battle.' },
  { id: 'vigor_pill', icon: '❤️', name: 'Bloodsurge Pill', minLevel: 5, cost: 200,
    kind: 'buff', durationMs: 90_000, effect: { hp: 0.30 }, desc: '+30% max HP for 90s of battle.' },
];

const BY_ID = Object.fromEntries(PILLS.map((p) => [p.id, p]));

export function pillById(id) {
  return BY_ID[id] ?? null;
}

const STAT_LABELS = { attack: 'Attack', defense: 'Defense', damage: 'Damage', armor: 'Armor', hp: 'max HP' };

export function buffText(pill) {
  return Object.entries(pill.effect)
    .map(([s, pct]) => `${pct > 0 ? '+' : ''}${Math.round(pct * 100)}% ${STAT_LABELS[s] ?? s}`)
    .join(', ');
}

// --- Active timed buffs (own list, never player.activeBuffs) ---

export function activePillBuffs(player, now = Date.now()) {
  return (player.pillBuffs ?? []).filter((b) => b.expiresAt > now);
}

// Apply active pill buffs to a combat-actor snapshot (percentages on the
// already-computed effective stats). Called from game.js at combat time, so it
// never mutates persistent stats. hp buffs raise both maxHp and current hp
// (the player enters every fight at full).
export function applyPillBuffs(actor, player, now = Date.now()) {
  for (const b of activePillBuffs(player, now)) {
    for (const [stat, pct] of Object.entries(b.effect)) {
      if (stat === 'hp') {
        actor.maxHp = Math.max(1, Math.round(actor.maxHp * (1 + pct)));
        actor.hp = actor.maxHp;
      } else if (actor.stats[stat] != null) {
        actor.stats[stat] = Math.max(0, Math.round(actor.stats[stat] * (1 + pct)));
      }
    }
  }
}

// Drop expired pill buffs; returns the removed entries (for a "fades" log).
export function cleanPillBuffs(player, now = Date.now()) {
  const buffs = player.pillBuffs ?? [];
  const expired = buffs.filter((b) => b.expiresAt <= now);
  if (expired.length) player.pillBuffs = buffs.filter((b) => b.expiresAt > now);
  return expired;
}

// =====================================================================
// UI — 🜁 Alchemy modal + a HUD bar for active pill buffs. Owns its own DOM.
// =====================================================================

let handlers = null;
let bound = false;

export function initAlchemy(state, h) {
  handlers = h;
  if (!bound) {
    bound = true;
    const overlay = document.getElementById('alchemy-overlay');
    document.getElementById('btn-alchemy').addEventListener('click', () => {
      renderAlchemy(state);
      overlay.classList.remove('hidden');
    });
    document.getElementById('btn-close-alchemy').addEventListener('click', () => overlay.classList.add('hidden'));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.add('hidden'); });
    // The HUD bar lives under the header (like the event banner).
    const header = document.getElementById('header');
    if (header && !document.getElementById('pill-buff-bar')) {
      const bar = document.createElement('div');
      bar.id = 'pill-buff-bar';
      bar.className = 'hidden';
      header.insertAdjacentElement('afterend', bar);
    }
  }
  renderPillBar(state);
}

function fmt(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// The always-visible HUD strip of currently-active pill buffs + countdowns.
export function renderPillBar(state, now = Date.now()) {
  const bar = document.getElementById('pill-buff-bar');
  if (!bar) return;
  const active = activePillBuffs(state.player, now);
  if (!active.length) { bar.classList.add('hidden'); bar.innerHTML = ''; return; }
  bar.classList.remove('hidden');
  bar.innerHTML =
    `<span class="pill-bar-label" title="Timed buffs from quaffed pills, active for your next fights.">${PILL_ICON} Pill effects:</span>` +
    active
      .map((b) => `<span class="pill-chip" title="${b.name} — ${b.effect ? Object.entries(b.effect).map(([s, pct]) => `${pct > 0 ? '+' : ''}${Math.round(pct * 100)}% ${STAT_LABELS[s] ?? s}`).join(', ') : ''}, fades in ${fmt(b.expiresAt - now)}."><b>${b.icon} ${b.name}</b> <span class="dim">${fmt(b.expiresAt - now)}</span></span>`)
      .join('');
}

function renderAlchemy(state) {
  const p = state.player;
  const body = document.getElementById('alchemy-body');
  document.getElementById('alchemy-stones').textContent = `◆ ${p.spiritStones}`;
  body.innerHTML = '';

  for (const pill of PILLS) {
    const owned = p.consumables?.[pill.id] ?? 0;
    const levelOk = p.level >= pill.minLevel;
    const canAfford = p.spiritStones >= pill.cost;
    const active = pill.kind === 'buff' && activePillBuffs(p).some((b) => b.pillId === pill.id);

    const row = document.createElement('div');
    row.className = 'pill-row' + (levelOk ? '' : ' pill-locked');
    row.title = `${pill.desc} Brewing costs ${pill.cost} spirit stones ◆.${levelOk ? '' : ` Requires cultivation stage ${pill.minLevel}.`}`;
    row.innerHTML = `
      <div class="pill-icon">${pill.icon}</div>
      <div class="pill-info">
        <div class="pill-name">${pill.name} ${owned ? `<span class="pill-qty">×${owned}</span>` : ''}</div>
        <div class="pill-desc">${pill.desc}</div>
        <div class="pill-meta">${pill.kind === 'buff' ? buffText(pill) : 'Instant'}${levelOk ? '' : ` · <span class="pill-req">needs stage ${pill.minLevel}</span>`}${active ? ' · <span class="pill-active">active</span>' : ''}</div>
      </div>
      <div class="pill-actions"></div>`;
    const actions = row.querySelector('.pill-actions');
    row.querySelector('.pill-name').title = `${pill.name} — ${pill.kind === 'buff' ? `a timed combat buff (${buffText(pill)}) lasting ${Math.round(pill.durationMs / 1000)}s of battle` : pill.desc}. Costs ${pill.cost} spirit stones ◆ to brew.`;
    row.querySelector('.pill-meta').title = pill.kind === 'buff'
      ? `Applies ${buffText(pill)} to your next fights for ${Math.round(pill.durationMs / 1000)}s after you quaff it.`
      : 'Takes effect immediately when quaffed.';

    const brew = document.createElement('button');
    brew.type = 'button';
    brew.className = 'pill-brew';
    brew.textContent = `Brew (${pill.cost} ◆)`;
    brew.disabled = !levelOk || !canAfford;
    brew.title = !levelOk
      ? `Requires cultivation stage ${pill.minLevel}.`
      : !canAfford
        ? `Not enough spirit stones — brewing costs ${pill.cost} ◆, you have ${p.spiritStones} ◆.`
        : `Spend ${pill.cost} spirit stones ◆ to brew one ${pill.name}.`;
    brew.addEventListener('click', () => { handlers.brew(pill.id); renderAlchemy(state); });
    actions.append(brew);

    const use = document.createElement('button');
    use.type = 'button';
    use.className = 'pill-use';
    use.textContent = 'Use';
    use.disabled = owned <= 0;
    use.title = owned <= 0
      ? `You have none brewed — brew one for ${pill.cost} spirit stones ◆ first.`
      : pill.kind === 'buff'
        ? `Quaff a ${pill.name} for ${buffText(pill)} in your next ${Math.round(pill.durationMs / 1000)}s of battle.`
        : `Quaff a ${pill.name} — ${pill.desc}`;
    use.addEventListener('click', () => { handlers.use(pill.id); renderAlchemy(state); });
    actions.append(use);

    body.append(row);
  }
}
