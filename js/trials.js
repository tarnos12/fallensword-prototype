// Daily Trials (GDD §5): one wall-clock-daily challenge encounter. A rotating
// foe — the SAME for everyone on a given UTC day, derived deterministically from
// the day-number and the player's level — fought through the pure resolveCombat.
// One attempt per day (tracked by a day-number bucket on player.trials, so it
// resets at UTC midnight, offline-safe like every other wall-clock system here).
// A win pays bonus stones/XP (and sometimes gear); a loss/draw costs nothing —
// it's a free daily, so the incentive is purely "come back tomorrow".
//
// The combat MATH is reused (resolveCombat + the shared Actor shape); the foe is
// authored here as data. The module owns its own modal (never touches ui.js);
// the actual attempt (which mutates + persists) is a game.js wrapper the UI
// calls through a passed callback, keeping trials.js free of game-state writes.

const DAY_MS = 86_400_000;

// Days since the Unix epoch (UTC). The daily reset bucket.
export function dayNumber(now = Date.now()) {
  return Math.floor(now / DAY_MS);
}

// Small deterministic integer hash — lets the foe be stable per (day, level)
// with nothing persisted.
function hash(n) {
  let h = (n ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

// Three challenge tiers, chosen by the day hash. `mult` scales the foe off the
// player's own effective stats so the trial stays relevant at every level;
// `reward` scales the payout so a tougher foe is worth more.
const TIERS = [
  { key: 'lesser', label: 'Lesser Trial', mult: 0.85, reward: 0.8 },
  { key: 'even', label: 'Even Trial', mult: 1.0, reward: 1.0 },
  { key: 'greater', label: 'Greater Trial', mult: 1.2, reward: 1.5 },
];

// Flavour foes (name + honorific), picked deterministically per day.
const FOES = [
  { name: 'Mirror Adversary', title: 'a reflection of your own killing intent' },
  { name: 'Ashen Challenger', title: 'a revenant risen to test the living' },
  { name: 'Wandering Swordsaint', title: 'a nameless master seeking a worthy bout' },
  { name: 'Bloodmoon Ghoul', title: 'a beast that hungers only on the reset of the moon' },
  { name: 'Iron Sect Envoy', title: 'sent to measure your cultivation' },
  { name: 'Serpent of the Deep Vein', title: 'coiled in the day’s omen' },
  { name: 'Phantom of the Gorge', title: 'a shade that answers the daily bell' },
];

// A level-appropriate benchmark stat block (NOT the player's own stats). Basing
// the foe on level — not on the player's effective stats — is deliberate: it
// means better gear/allocation actually help you win the trial, so the daily
// rewards progression instead of scaling away from it. Tuned so an "even" trial
// is a fair fight for a moderately-geared cultivator of that level (a full
// balance pass, task J, will retune these constants against the sim).
function benchmark(level) {
  const L = level - 1;
  return {
    attack: 11 + 3.4 * L,
    defense: 8 + 2.6 * L,
    damage: 8 + 2.8 * L,
    armor: 3 + 1.5 * L,
    maxHp: 40 + 14 * L,
  };
}

// Build today's trial: the foe (a resolveCombat-ready Actor), its tier, and the
// reward it pays on a win. Deterministic from (day, player.level) — a fixed
// puzzle for the day, identical for every cultivator of that level.
export function todaysTrial(player, now = Date.now()) {
  const day = dayNumber(now);
  const bench = benchmark(player.level);
  const seed = hash(day * 1009 + player.level);
  const tier = TIERS[seed % TIERS.length];
  const foeInfo = FOES[hash(day) % FOES.length];

  const s = (v) => Math.max(1, Math.round(v * tier.mult));
  const foe = {
    id: `trial-${day}`,
    name: foeInfo.name,
    title: foeInfo.title,
    level: player.level,
    tier: tier.key,
    tierLabel: tier.label,
    stats: {
      attack: s(bench.attack),
      defense: s(bench.defense),
      damage: s(bench.damage),
      armor: s(bench.armor),
    },
    hp: s(bench.maxHp),
    maxHp: s(bench.maxHp),
  };

  const reward = {
    stones: Math.round(40 * player.level * tier.reward) + 30,
    xp: Math.round(30 * player.level * tier.reward) + 20,
    // Only the Greater trial can drop gear, and only sometimes (rolled at claim).
    itemChance: tier.key === 'greater' ? 0.5 : tier.key === 'even' ? 0.25 : 0,
  };

  return { day, foe, tier, reward };
}

// Has the player already used today's attempt?
export function attemptedToday(player, now = Date.now()) {
  return (player.trials?.lastDay ?? -1) === dayNumber(now);
}

// ms until the next UTC reset (for the "next trial in …" hint).
export function msUntilReset(now = Date.now()) {
  return DAY_MS - (now % DAY_MS);
}

function formatCountdown(ms) {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}

// =====================================================================
// UI — self-contained modal (no ui.js dependency).
// =====================================================================

let bound = false;
let lastResult = null; // the most recent attempt result, shown until the modal reopens

export function initTrials(state, handlers) {
  if (!bound) {
    bound = true;
    const overlay = document.getElementById('trials-overlay');
    document.getElementById('btn-trials').addEventListener('click', () => {
      lastResult = null; // fresh view each open
      renderTrialsPanel(state, handlers);
      overlay.classList.remove('hidden');
    });
    document.getElementById('btn-close-trials').addEventListener('click', () => {
      overlay.classList.add('hidden');
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.add('hidden');
    });
  }
  renderTrialBadge(state);
}

// The 🗓 button badge: "Ready" when today's attempt is available, else a
// countdown to the reset.
export function renderTrialBadge(state) {
  const el = document.getElementById('trials-badge');
  if (!el) return;
  if (attemptedToday(state.player)) {
    el.textContent = formatCountdown(msUntilReset());
    el.classList.remove('trial-ready');
  } else {
    el.textContent = 'Ready';
    el.classList.add('trial-ready');
  }
}

function statRow(label, value) {
  return `<div class="trial-stat"><span>${label}</span><b>${value}</b></div>`;
}

function renderTrialsPanel(state, handlers) {
  const body = document.getElementById('trials-body');
  const p = state.player;
  const { foe, tier, reward } = todaysTrial(p);
  const done = attemptedToday(p);

  const foeCard = `
    <div class="trial-foe trial-${tier.key}">
      <div class="trial-foe-head">
        <span class="trial-tier">${tier.label}</span>
        <span class="trial-foe-name">${foe.name}</span>
        <span class="trial-foe-title">${foe.title}</span>
      </div>
      <div class="trial-stats">
        ${statRow('Attack', foe.stats.attack)}
        ${statRow('Defense', foe.stats.defense)}
        ${statRow('Damage', foe.stats.damage)}
        ${statRow('Armor', foe.stats.armor)}
        ${statRow('HP', foe.maxHp)}
      </div>
      <div class="trial-reward">Victory: <b>+${reward.stones}</b> stones · <b>+${reward.xp}</b> XP${reward.itemChance ? ' · a chance at an artifact' : ''}</div>
    </div>`;

  let action;
  if (lastResult) {
    const r = lastResult;
    const cls = r.outcome === 'win' ? 'win' : r.outcome === 'loss' ? 'loss' : 'draw';
    const msg =
      r.outcome === 'win'
        ? `Victory! You claimed ${r.reward.stones} spirit stones and ${r.reward.xp} XP${r.reward.item ? ` and looted ${r.reward.item.name}` : ''}.`
        : r.outcome === 'loss'
        ? 'Defeated — but the trial costs nothing. Steel yourself and return tomorrow.'
        : 'A draw — neither fell. The trial resets tomorrow.';
    action = `<div class="banner ${cls}">${msg}</div>
      <p class="trial-note">Next trial in ${formatCountdown(msUntilReset())}.</p>`;
  } else if (done) {
    action = `<p class="trial-note">You have faced today's trial. The next challenge arrives in ${formatCountdown(msUntilReset())}.</p>`;
  } else {
    action = `<button id="btn-attempt-trial" type="button" class="trial-attempt-btn">Face the Trial</button>
      <p class="trial-note">One attempt per day. A loss carries no penalty.</p>`;
  }

  body.innerHTML = foeCard + action;

  const btn = document.getElementById('btn-attempt-trial');
  if (btn) {
    btn.addEventListener('click', () => {
      const res = handlers.onAttempt();
      if (res && res.ok) lastResult = res;
      renderTrialsPanel(state, handlers);
      renderTrialBadge(state);
    });
  }
}
