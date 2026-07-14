// The Hall of Merit — premium upgrade shop (doc 20 §3). Self-contained like
// crafting.js/salvage.js/ascension.js: owns its own catalog data, its own pure
// cost/effect helpers, its own modal DOM, and its own stylesheet
// (css/meritshop.css, self-injected — no index.html edit). The ONE deliberate
// departure from the usual "own nav button" pattern: per the author's
// direction this shop opens from the premium-currency icon already in the HUD
// markup (`#btn-premium`, Wave 1), not a new nav button — `initMeritShop`
// attaches its click handler directly to that element.
//
// Twelve stacking catalog rows (capacity/convenience/consumable) absorb the
// scattered sinks the redesign is consolidating here (inventory slots, Qi
// cap/regen, loadout slots, market stall slots, XP-loss protection, respec,
// an instant Qi-restore, two timed elixirs) plus one exclusive, re-pickable
// build choice (the Dao Heart) — the T2/Idle-Slayer guardrail: a real
// opportunity-cost pick, not just another queue row.

import { respecStats, statPointsSpent } from './progression.js';
import { resetMeridians, meridianPointsSpent } from './meridians.js';
import { resetTechniques, techniquePointsSpent } from './techniques.js';

// --- Catalog data (doc 20 §3.2) ---------------------------------------------

export const MERIT_UPGRADES = {
  packSlots: {
    name: 'Pack Expansion', kind: 'stacking',
    desc: 'Widen your inventory pack.',
    perPurchase: 2, maxPurchases: 6, // +2 to +12 slots total (12 -> 24)
    baseCost: 15, costGrowth: 1.6,
  },
  qiCap: {
    name: 'Qi Reservoir', kind: 'stacking',
    desc: 'Raise your maximum Qi.',
    perPurchase: 10, maxPurchases: 8, // +10 to +80 max Qi
    baseCost: 10, costGrowth: 1.5,
  },
  qiRegenPct: {
    name: 'Qi Current Talisman', kind: 'stacking',
    desc: 'Speed up passive Qi regeneration.',
    perPurchase: 0.05, maxPurchases: 6, // -5% to -30% regen interval, capped so the Qi gate never disappears
    baseCost: 20, costGrowth: 1.7,
  },
  loadoutSlots: {
    name: 'Combat Set Expansion', kind: 'stacking',
    desc: 'Save more Combat Sets (gear loadouts).',
    perPurchase: 1, maxPurchases: 2,
    baseCost: 25, costGrowth: 2.0,
  },
  marketSlots: {
    name: 'Auction Stall Expansion', kind: 'stacking',
    desc: 'List more items at once in the Treasure Pavilion.',
    perPurchase: 1, maxPurchases: 3,
    baseCost: 20, costGrowth: 1.8,
  },
  xpProtection: {
    name: 'Ward Against Regression', kind: 'stacking',
    desc: 'Reduce the XP lost on death.',
    perPurchase: 0.25, maxPurchases: 4, // -25% to -100% of death XP loss
    baseCost: 25, costGrowth: 1.8,
  },
  statRespec: {
    name: 'Cultivation Respec Talisman', kind: 'respec',
    desc: 'Refund every allocated stat point to spend again.',
    respecFn: 'respecStats', costFn: 'statPointsSpent',
    maxPurchases: Infinity, baseCost: 20, costScalesWithPointsSpent: 2,
  },
  meridianRespec: {
    name: 'Meridian Respec Talisman', kind: 'respec',
    desc: 'Refund every opened meridian rank to spend again.',
    respecFn: 'resetMeridians', costFn: 'meridianPointsSpent',
    maxPurchases: Infinity, baseCost: 20, costScalesWithPointsSpent: 2,
  },
  techniqueRespec: {
    name: 'Technique Respec Talisman', kind: 'respec',
    desc: 'Unlearn every technique and refund the points to spend again.',
    respecFn: 'resetTechniques', costFn: 'techniquePointsSpent',
    maxPurchases: Infinity, baseCost: 20, costScalesWithPointsSpent: 2,
  },
  qiRestore: {
    name: 'Spirit Replenishment Draught', kind: 'instant',
    desc: 'Instantly restore 40 Qi (capped at your maximum).',
    maxPurchases: Infinity, baseCost: 8, costGrowth: 1.0,
    effect: { qiRestore: 40 },
  },
  xpBoost: {
    name: 'Insight Charm', kind: 'timed',
    desc: '+25% battle XP for 1 hour. Repurchasing extends the timer.',
    maxPurchases: Infinity, baseCost: 15, costGrowth: 1.0,
    effect: { xpPct: 0.25, durationMs: 60 * 60 * 1000 },
  },
  dropBoost: {
    name: 'Fortune Draught', kind: 'timed',
    desc: '+25% drop chance for 1 hour. Repurchasing extends the timer.',
    maxPurchases: Infinity, baseCost: 15, costGrowth: 1.0,
    effect: { dropPct: 0.25, durationMs: 60 * 60 * 1000 },
  },
};

// Respec rows call the real reset function directly (each takes only
// `player`, so meritshop.js — which already imports the matching
// points-spent getter for cost math — can invoke it in the same breath as
// charging Merit, no game.js round-trip required).
const RESPEC_COST_FNS = { statPointsSpent, meridianPointsSpent, techniquePointsSpent };
const RESPEC_FNS = { respecStats, resetMeridians, resetTechniques };

export function meritUpgradeCost(upgradeId, player) {
  const u = MERIT_UPGRADES[upgradeId];
  if (!u) return Infinity;
  if (u.kind === 'respec') {
    const spent = RESPEC_COST_FNS[u.costFn](player);
    return u.baseCost + u.costScalesWithPointsSpent * spent;
  }
  const owned = player.meritShop?.purchases?.[upgradeId] ?? 0;
  return Math.round(u.baseCost * Math.pow(u.costGrowth, owned));
}

function ensureMeritShopState(player) {
  if (!player.meritShop) player.meritShop = { purchases: {}, daoHeart: null, daoHeartSwitches: 0 };
  if (!player.meritShop.purchases) player.meritShop.purchases = {};
  if (!player.meritBuffs) player.meritBuffs = [];
  return player.meritShop;
}

export function canBuyMeritUpgrade(player, upgradeId) {
  const u = MERIT_UPGRADES[upgradeId];
  if (!u) return { ok: false, reason: 'Unknown upgrade.' };
  ensureMeritShopState(player);
  const owned = player.meritShop.purchases[upgradeId] ?? 0;
  if (u.kind === 'stacking' && owned >= u.maxPurchases) return { ok: false, reason: 'Fully upgraded.' };
  if (u.gateStage && player.level < u.gateStage) {
    return { ok: false, reason: `Unlocks at cultivation stage ${u.gateStage}.` };
  }
  const cost = meritUpgradeCost(upgradeId, player);
  if ((player.merit ?? 0) < cost) return { ok: false, reason: 'Not enough Merit.' };
  return { ok: true, cost };
}

// Purchase an upgrade. Mutates `player` in place; caller (the render layer
// below, or a future game.js wrapper) owns logging/toasting/saving. For the
// 'instant' qiRestore row, meritshop.js doesn't know `state.qi` (only
// `player`), so it returns `{ effect }` and the caller applies it to the
// wider game state (mirrors ascension.js's performAscension()/ascend() split).
export function buyMeritUpgrade(player, upgradeId, now = Date.now()) {
  const check = canBuyMeritUpgrade(player, upgradeId);
  if (!check.ok) return check;
  const u = MERIT_UPGRADES[upgradeId];
  player.merit -= check.cost;
  switch (u.kind) {
    case 'timed': {
      const existing = player.meritBuffs.find((b) => b.id === upgradeId);
      if (existing) existing.expiresAt += u.effect.durationMs;
      else player.meritBuffs.push({ id: upgradeId, expiresAt: now + u.effect.durationMs });
      return { ok: true, cost: check.cost };
    }
    case 'instant':
      return { ok: true, cost: check.cost, effect: u.effect };
    case 'respec': {
      const refund = RESPEC_FNS[u.respecFn](player);
      return { ok: true, cost: check.cost, refunded: refund.refunded };
    }
    case 'stacking':
    default:
      player.meritShop.purchases[upgradeId] = (player.meritShop.purchases[upgradeId] ?? 0) + 1;
      return { ok: true, cost: check.cost };
  }
}

// The one add-line this module contributes to other systems' aggregates —
// mirrors sets.js/sockets.js's `*Bonuses(player)` convention. Consumed (at
// integration) by game.js's maxQi()/tickQi()/death-XP-loss calc, items.js's
// effectiveInventorySize(), loadouts.js's effectiveMaxLoadouts(), and
// market.js's effectiveMaxPlayerListings().
export function meritShopBonuses(player) {
  const p = player.meritShop?.purchases ?? {};
  return {
    qiCap: (p.qiCap ?? 0) * MERIT_UPGRADES.qiCap.perPurchase,
    qiRegenPct: Math.min(0.3, (p.qiRegenPct ?? 0) * MERIT_UPGRADES.qiRegenPct.perPurchase),
    packSlots: (p.packSlots ?? 0) * MERIT_UPGRADES.packSlots.perPurchase,
    loadoutSlots: (p.loadoutSlots ?? 0) * MERIT_UPGRADES.loadoutSlots.perPurchase,
    marketSlots: (p.marketSlots ?? 0) * MERIT_UPGRADES.marketSlots.perPurchase,
    xpLossMult: Math.max(0, 1 - (p.xpProtection ?? 0) * MERIT_UPGRADES.xpProtection.perPurchase),
  };
}

// Timed consumable multipliers — read the same way guildBuffs()'s xpPct/
// stonePct are read today, NOT routed through effectiveStats (reward-math
// modifiers, not combat stats). Lazily expires stale buffs on read.
export function meritBuffMultipliers(player, now = Date.now()) {
  player.meritBuffs = (player.meritBuffs ?? []).filter((b) => b.expiresAt > now);
  let xpPct = 0, dropPct = 0;
  for (const b of player.meritBuffs) {
    if (b.id === 'xpBoost') xpPct += MERIT_UPGRADES.xpBoost.effect.xpPct;
    if (b.id === 'dropBoost') dropPct += MERIT_UPGRADES.dropBoost.effect.dropPct;
  }
  return { xpPct, dropPct };
}

// --- The Dao Heart — the one exclusive, re-pickable-at-a-cost build choice
// (doc 20 §3.4, the T2/Idle-Slayer guardrail: a real opportunity cost, not a
// checklist item — only one path is active at a time). ---------------------

export const DAO_HEART_PATHS = {
  hunter: { name: 'Path of the Hunter', desc: '+15% Merit from all sources.', meritGainPct: 0.15 },
  merchant: { name: 'Path of the Merchant', desc: '+15% Auction House sell/list value, both currencies.', sellPct: 0.15 },
  ascetic: { name: 'Path of the Ascetic', desc: '-10% Qi cost on active-technique casts.', qiCostPct: -0.10 },
};
const DAO_HEART_PICK_COST = 40;
const DAO_HEART_SWITCH_COST = 60; // steep on purpose — a re-pick is a real commitment, not a toggle

export function daoHeartCost(player) {
  return player.meritShop?.daoHeart ? DAO_HEART_SWITCH_COST : DAO_HEART_PICK_COST;
}

export function pickDaoHeart(player, pathId) {
  if (!DAO_HEART_PATHS[pathId]) return { ok: false, reason: 'Unknown path.' };
  ensureMeritShopState(player);
  if (player.meritShop.daoHeart === pathId) return { ok: false, reason: 'Already walking this path.' };
  const cost = daoHeartCost(player);
  if ((player.merit ?? 0) < cost) return { ok: false, reason: 'Not enough Merit.' };
  const wasSet = !!player.meritShop.daoHeart;
  player.merit -= cost;
  player.meritShop.daoHeart = pathId;
  if (wasSet) player.meritShop.daoHeartSwitches += 1;
  return { ok: true, cost, pathId };
}

export function daoHeartBonuses(player) {
  return DAO_HEART_PATHS[player.meritShop?.daoHeart] ? {
    meritGainPct: 0, sellPct: 0, qiCostPct: 0,
    ...DAO_HEART_PATHS[player.meritShop.daoHeart],
  } : { meritGainPct: 0, sellPct: 0, qiCostPct: 0 };
}

// =====================================================================
// Rendering — self-contained (own modal, no index.html/ui.js edit). The
// click handler attaches to the HUD's existing #btn-premium (✧) icon.
// =====================================================================

const $ = (id) => document.getElementById(id);

let overlay = null;
let shop = null; // { state, actions }

function ensureStylesheet() {
  if (document.querySelector('link[data-meritshop]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'css/meritshop.css';
  link.setAttribute('data-meritshop', '');
  document.head.appendChild(link);
}

function fmtOwned(u, owned) {
  if (u.kind !== 'stacking') return '';
  if (owned >= u.maxPurchases) return ' · MAX';
  return ` · owned ${owned}/${u.maxPurchases}`;
}

function upgradeRow(id) {
  const { state, actions } = shop;
  const p = state.player;
  ensureMeritShopState(p);
  const u = MERIT_UPGRADES[id];
  const owned = p.meritShop.purchases[id] ?? 0;
  const check = canBuyMeritUpgrade(p, id);
  const cost = meritUpgradeCost(id, p);

  const row = document.createElement('div');
  row.className = 'merit-row';
  const info = document.createElement('div');
  info.className = 'merit-info';
  info.innerHTML = `<div class="merit-name">${u.name}${fmtOwned(u, owned)}</div>
    <div class="merit-desc dim">${u.desc}</div>`;
  info.title = u.desc;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = check.ok ? 'merit-buy-btn claim-btn' : 'merit-buy-btn';
  btn.textContent = `${u.kind === 'stacking' && owned >= u.maxPurchases ? 'Maxed' : `Buy · ${cost} ✧`}`;
  btn.disabled = !check.ok;
  btn.title = check.ok ? `Spend ${cost} Merit on ${u.name}.` : check.reason;
  btn.addEventListener('click', () => { actions.buy(id); });
  row.append(info, btn);
  return row;
}

function daoHeartSection() {
  const { state, actions } = shop;
  const p = state.player;
  ensureMeritShopState(p);
  const current = p.meritShop.daoHeart;
  const cost = daoHeartCost(p);

  const section = document.createElement('div');
  section.className = 'merit-daoheart';
  const head = document.createElement('h3');
  head.textContent = 'The Dao Heart';
  const note = document.createElement('p');
  note.className = 'merit-daoheart-note dim';
  note.textContent = current
    ? `You walk ${DAO_HEART_PATHS[current].name}. Switching paths costs ${DAO_HEART_SWITCH_COST} Merit — a real commitment, not a toggle.`
    : `Choose one path — only one is active at a time. First pick costs ${DAO_HEART_PICK_COST} Merit.`;
  section.append(head, note);

  const grid = document.createElement('div');
  grid.className = 'merit-daoheart-grid';
  for (const [id, path] of Object.entries(DAO_HEART_PATHS)) {
    const card = document.createElement('div');
    card.className = `merit-daoheart-card${current === id ? ' active' : ''}`;
    const btnLabel = current === id ? 'Walking this path' : `Choose · ${cost} ✧`;
    card.innerHTML = `<div class="merit-daoheart-name">${path.name}</div>
      <div class="merit-daoheart-desc dim">${path.desc}</div>`;
    const btn = document.createElement('button');
    btn.type = 'button';
    const affordable = (p.merit ?? 0) >= cost;
    btn.className = current === id ? 'merit-daoheart-btn active' : 'merit-daoheart-btn';
    btn.textContent = btnLabel;
    btn.disabled = current === id || !affordable;
    btn.title = current === id
      ? 'Already walking this path.'
      : affordable ? `Spend ${cost} Merit to walk ${path.name}.` : 'Not enough Merit.';
    btn.addEventListener('click', () => actions.pickDaoHeart(id));
    card.appendChild(btn);
    grid.appendChild(card);
  }
  section.appendChild(grid);
  return section;
}

export function renderMeritShop(state) {
  if (!overlay) return;
  const p = state.player;
  ensureMeritShopState(p);

  $('meritshop-balance').textContent = `✧ ${p.merit ?? 0} Merit`;

  const body = $('meritshop-body');
  body.innerHTML = '';

  const intro = document.createElement('p');
  intro.className = 'meritshop-intro';
  intro.textContent = 'Heaven does not coin money, but it keeps a ledger. Spend Merit where spirit stones cannot buy.';
  body.appendChild(intro);

  // Testing shortcut: trade spirit stones for Merit at 10 : 1.
  const conv = document.createElement('div');
  conv.className = 'merit-convert';
  conv.style.cssText = 'margin:0 0 16px;padding:11px 13px;border:1px solid var(--line,rgba(200,162,74,.28));border-radius:6px;display:flex;flex-wrap:wrap;gap:10px 14px;align-items:center;justify-content:space-between';
  conv.innerHTML = `
    <span style="font-weight:600">Trade spirit stones → Merit <em style="opacity:.7;font-style:normal">(10 : 1)</em><br>
      <small style="opacity:.65">You have &#9670; ${p.spiritStones ?? 0} spirit stones</small></span>
    <span style="display:flex;gap:8px;align-items:center">
      <input id="merit-convert-input" type="number" min="10" step="10" value="100" style="width:92px;padding:5px 7px;text-align:right">
      <button id="merit-convert-btn" type="button">Convert</button>
    </span>`;
  body.appendChild(conv);
  $('merit-convert-btn').addEventListener('click', () => {
    shop.actions.convert?.(parseInt($('merit-convert-input').value, 10) || 0);
  });

  const grid = document.createElement('div');
  grid.className = 'merit-grid';
  for (const id of Object.keys(MERIT_UPGRADES)) grid.appendChild(upgradeRow(id));
  body.appendChild(grid);

  body.appendChild(daoHeartSection());
}

// initMeritShop(state, actions) — actions: { buy(upgradeId), pickDaoHeart(pathId) }.
// Both are expected to apply the pure result above to the wider game state
// (Qi restore / respec logging / saveGame) the same way every other
// self-contained module's game.js wrapper does (e.g. ascend()).
export function initMeritShop(state, actions) {
  shop = { state, actions };
  ensureStylesheet();

  overlay = document.createElement('div');
  overlay.id = 'meritshop-overlay';
  overlay.className = 'hidden';
  overlay.innerHTML = `
    <div id="meritshop-panel">
      <div id="meritshop-header">
        <h2>Hall of Merit</h2>
        <span id="meritshop-balance" class="meritshop-balance"></span>
        <button id="btn-close-meritshop" type="button" title="Close">✕</button>
      </div>
      <div id="meritshop-body"></div>
    </div>`;
  document.body.appendChild(overlay);

  const open = () => { renderMeritShop(state); overlay.classList.remove('hidden'); };
  const close = () => overlay.classList.add('hidden');
  $('btn-premium')?.addEventListener('click', open);
  $('btn-close-meritshop').addEventListener('click', close);
  // The top-bar Merit tile is a shortcut into the Hall of Merit.
  const meritTile = $('chip-merit')?.closest('.hud-stat') || $('chip-merit');
  if (meritTile) { meritTile.style.cursor = 'pointer'; meritTile.title = 'Open the Hall of Merit'; meritTile.addEventListener('click', open); }
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
}
