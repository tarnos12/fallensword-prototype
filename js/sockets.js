// Gem sockets / enchanting (board task U). Higher-rarity gear rolls empty
// SOCKETS; hunting drops loose GEMS; slotting a gem into a socket adds its flat
// stat to the single effectiveStats aggregation pipeline (§7.3) as the fifth
// flat source, after gear, Spirit Cards and meridians. A gem embedded in gear
// is consumed from the pack into that socket and can be popped back out later.
//
// Split of concerns, kept parallel-safe:
//   - This module OWNS the gem catalog, socket-count table, gem generation, the
//     bonus aggregation (socketBonuses — the one add-line in progression.js), the
//     slot/unslot actions, and its own 💎 Jewelcraft modal + button.
//   - items.js only asks two pure questions of us — "how many sockets for this
//     rarity?" (socketCountFor) and "mint a gem" (generateGem) — so gem drops and
//     socketed gear flow through the EXISTING loot/save pipelines untouched.
//   - ui.js reads a few pure helpers (isGem, gemLabel, socketLine) to render gems
//     in the pack + sockets in the item tooltip.
//
// Deliberately ONE-DIRECTIONAL imports: this module imports nothing from items.js
// or progression.js, so there is no cycle (items.js → sockets.js, progression.js
// → sockets.js). And, like meridians.js/crafting.js, no `document` access at
// module load — the DOM lives inside initSockets only — so progression.js can
// import socketBonuses in headless sims safely.

// --- Catalog -------------------------------------------------------------

// One gem per combat stat. Colour-coded icon doubles as the pack-slot glyph.
// perLevel is the level-1 magnitude; it scales with the gem's level like gear.
// hp is worth less per point (matches POINT_VALUE / meridian weighting), armor
// a touch stronger, so a gem is roughly a good gear attribute of its tier.
export const GEMS = {
  attack: { stat: 'attack', name: 'Bloodstar Ruby', icon: '🔴', perLevel: 2 },
  defense: { stat: 'defense', name: 'Azuremist Sapphire', icon: '🔵', perLevel: 2 },
  damage: { stat: 'damage', name: 'Cinnabar Garnet', icon: '🟠', perLevel: 2 },
  armor: { stat: 'armor', name: 'Ironheart Onyx', icon: '🟤', perLevel: 1 },
  hp: { stat: 'hp', name: 'Verdant Spirit-Jade', icon: '🟢', perLevel: 8 },
};

const GEM_LIST = Object.values(GEMS);
const STAT_LABELS = { attack: 'Attack', defense: 'Defense', damage: 'Damage', armor: 'Armor', hp: 'Max HP' };

// Gems drop at the same first three tiers gear does (random loot caps at Rare,
// GDD §6.1). The tier multiplies the gem's magnitude.
const GEM_TIERS = {
  common: { key: 'common', label: 'Common', mult: 1.0 },
  uncommon: { key: 'uncommon', label: 'Uncommon', mult: 1.5 },
  rare: { key: 'rare', label: 'Rare', mult: 2.2 },
};
const GEM_TIER_WEIGHTS = [['common', 70], ['uncommon', 24], ['rare', 6]];

// How many sockets a piece of gear rolls, by rarity. Only Rare+ gear is socketed
// — the reward for a better base item is also more enchant surface. Keyed by the
// same rarity strings items.js uses; unknown/low rarities → 0 (no sockets).
const SOCKET_COUNTS = { rare: 1, epic: 2, legendary: 2, mythic: 3 };

export function socketCountFor(rarityKey) {
  return SOCKET_COUNTS[rarityKey] ?? 0;
}

// Chance that a gear drop is instead a loose gem (rolled inside items.js
// rollDrop, AFTER its own DROP_CHANCE gate — so gems are a slice of drops, not
// an extra roll). Kept modest: gems are a treat, and you need gear to socket.
export const GEM_DROP_CHANCE = 0.18;

// --- Gem generation (called by items.js rollDrop) ------------------------

let gemCounter = 0;
export function setGemCounter(n) { gemCounter = n; }
export function getGemCounter() { return gemCounter; }

function pickTier(rng) {
  let roll = rng() * 100;
  for (const [key, w] of GEM_TIER_WEIGHTS) {
    roll -= w;
    if (roll <= 0) return GEM_TIERS[key];
  }
  return GEM_TIERS.common;
}

// A gem's stat magnitude at a given level/tier — same per-level growth curve as
// a gear attribute (items.js scaleBound), so gems stay in-band as you level.
function gemValue(base, level, mult) {
  return Math.max(1, Math.round(base * (1 + 0.4 * (level - 1)) * mult));
}

// Mint a loose gem item. Shares the item shape enough (id/name/rarity/level) to
// ride the pack, save, sell and destroy pipelines, but carries kind:'gem' and a
// single {stat,value} — it has no `slot`, so it never equips as gear.
export function generateGem(level, rng, statKey, tierKey) {
  const gem = statKey ? GEMS[statKey] : GEM_LIST[Math.floor(rng() * GEM_LIST.length)];
  const tier = tierKey ? GEM_TIERS[tierKey] : pickTier(rng);
  const value = gemValue(gem.perLevel, level, tier.mult);
  return {
    id: `gem-${++gemCounter}`,
    kind: 'gem',
    name: `${tier.label} ${gem.name}`,
    rarity: tier.key, // lets sellValue/repairCost-style rarity lookups work
    level,
    stat: gem.stat,
    value,
  };
}

// --- Predicates / display helpers (pure — used by ui.js) -----------------

export function isGem(item) {
  return !!item && item.kind === 'gem';
}

export function gemIcon(gem) {
  return GEMS[gem.stat]?.icon ?? '💎';
}

export function gemStatText(gem) {
  return `+${gem.value} ${STAT_LABELS[gem.stat] ?? gem.stat}`;
}

export function gemLabel(gem) {
  return `${gemIcon(gem)} ${gem.name}`;
}

// Tooltip lines for an item's sockets: filled sockets show their gem, empty ones
// a hollow marker. Returns '' for gear that has no sockets (or a gem itself).
export function socketLine(item) {
  if (!item || isGem(item) || !Array.isArray(item.sockets) || item.sockets.length === 0) return '';
  const rows = item.sockets
    .map((g) =>
      g
        ? `<div class="tt-line socket-filled">${gemIcon(g)} ${g.name} <span class="dim">(${gemStatText(g)})</span></div>`
        : `<div class="tt-line socket-empty dim">◇ empty socket</div>`
    )
    .join('');
  return `<div class="tt-line dim socket-head">Sockets</div>${rows}`;
}

// --- Aggregation: the ONE add-line for progression.js effectiveStats -------

// Flat stat bonuses from every gem slotted into EQUIPPED gear. Broken gear still
// counts here? No — mirror the gear rule: a broken item grants nothing, so its
// gems lie dormant too. Tolerates old saves (no `sockets`) → all zero.
export function socketBonuses(player) {
  const out = { attack: 0, defense: 0, damage: 0, armor: 0, hp: 0 };
  for (const item of Object.values(player.equipment ?? {})) {
    if (!item || item.durability <= 0 || !Array.isArray(item.sockets)) continue;
    for (const gem of item.sockets) {
      if (gem && out[gem.stat] != null) out[gem.stat] += gem.value;
    }
  }
  return out;
}

// --- Slot / unslot actions (mutate state; game/main wraps + saves) ---------

// A gem in the pack goes into an empty socket of an equipped item.
export function slotGem(player, itemId, socketIndex, gemId) {
  const item = Object.values(player.equipment ?? {}).find((i) => i && i.id === itemId);
  if (!item || !Array.isArray(item.sockets)) return { ok: false, reason: 'No such socketed item equipped.' };
  if (socketIndex < 0 || socketIndex >= item.sockets.length) return { ok: false, reason: 'No such socket.' };
  if (item.sockets[socketIndex]) return { ok: false, reason: 'That socket is already filled.' };
  const idx = player.inventory.findIndex((i) => i.id === gemId && isGem(i));
  if (idx === -1) return { ok: false, reason: 'Gem not found in your pack.' };
  const [gem] = player.inventory.splice(idx, 1);
  item.sockets[socketIndex] = gem;
  return { ok: true, item, gem, socketIndex };
}

// Pop a gem back out into the pack (needs a free pack slot).
export function unslotGem(player, itemId, socketIndex, invSize) {
  const item = Object.values(player.equipment ?? {}).find((i) => i && i.id === itemId);
  if (!item || !Array.isArray(item.sockets)) return { ok: false, reason: 'No such socketed item equipped.' };
  const gem = item.sockets[socketIndex];
  if (!gem) return { ok: false, reason: 'That socket is empty.' };
  if (invSize != null && player.inventory.length >= invSize) return { ok: false, reason: 'Your pack is full — free a slot first.' };
  item.sockets[socketIndex] = null;
  player.inventory.push(gem);
  return { ok: true, item, gem, socketIndex };
}

// --- Self-contained view: a 💎 Jewelcraft button + its modal ---------------

const $ = (id) => document.getElementById(id);

let overlay = null;
let sk = null; // { state, actions }

function socketedItems(player) {
  return ['weapon', 'robe']
    .map((slot) => player.equipment?.[slot])
    .filter((it) => it && Array.isArray(it.sockets) && it.sockets.length > 0);
}

function gemsInPack(player) {
  return (player.inventory ?? []).filter(isGem);
}

function socketRow(item, index) {
  const { state, actions } = sk;
  const p = state.player;
  const gem = item.sockets[index];

  const row = document.createElement('div');
  row.className = 'sk-socket';

  if (gem) {
    row.innerHTML = `<span class="sk-gem rarity-${gem.rarity}">${gemIcon(gem)} ${gem.name}</span>
      <span class="dim sk-gem-stat">${gemStatText(gem)}</span>`;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sk-btn';
    btn.textContent = 'Remove';
    btn.title = 'Pop this gem back into your pack';
    btn.addEventListener('click', () => { actions.unslot(item.id, index); rerender(); });
    row.appendChild(btn);
  } else {
    row.innerHTML = `<span class="sk-empty dim">◇ empty socket</span>`;
    const gems = gemsInPack(p);
    if (gems.length === 0) {
      const note = document.createElement('span');
      note.className = 'dim sk-gem-stat';
      note.textContent = 'No gems in pack';
      row.appendChild(note);
    } else {
      const pick = document.createElement('div');
      pick.className = 'sk-pick';
      for (const g of gems) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = `sk-chip rarity-${g.rarity}`;
        b.title = `Slot ${g.name} (${gemStatText(g)})`;
        b.textContent = `${gemIcon(g)} ${gemStatText(g)}`;
        b.addEventListener('click', () => { actions.slot(item.id, index, g.id); rerender(); });
        pick.appendChild(b);
      }
      row.appendChild(pick);
    }
  }
  return row;
}

export function renderSockets(state) {
  if (!overlay) return;
  const p = state.player;
  const items = socketedItems(p);
  const gems = gemsInPack(p);

  $('sockets-free').textContent = `— ${gems.length} loose gem${gems.length === 1 ? '' : 's'}`;

  const body = $('sockets-body');
  body.innerHTML = '';

  const intro = document.createElement('p');
  intro.className = 'empty-note';
  intro.textContent = 'Slot gems into your equipped gear for permanent flat bonuses. Rare and finer artifacts carry sockets; gems drop from beasts. Remove a gem any time to move it.';
  body.appendChild(intro);

  if (items.length === 0) {
    const none = document.createElement('p');
    none.className = 'empty-note';
    none.textContent = 'No socketed gear equipped. Equip a Rare or finer weapon/robe to reveal its sockets.';
    body.appendChild(none);
    return;
  }

  for (const item of items) {
    const card = document.createElement('div');
    card.className = 'sk-item';
    const head = document.createElement('div');
    head.className = `sk-item-head rarity-${item.rarity}`;
    head.textContent = `${item.name} · ${item.sockets.filter(Boolean).length}/${item.sockets.length} sockets`;
    card.appendChild(head);
    item.sockets.forEach((_, i) => card.appendChild(socketRow(item, i)));
    body.appendChild(card);
  }
}

function rerender() {
  renderSockets(sk.state);
}

export function initSockets(state, actions) {
  sk = { state, actions };

  const btn = document.createElement('button');
  btn.id = 'btn-sockets';
  btn.type = 'button';
  btn.className = 'sockets-nav-btn';
  btn.title = 'Jewelcraft — slot gems into your gear for passive bonuses';
  btn.textContent = '💎 Jewelcraft';
  ($('nav-menu') ?? document.getElementById('char-panel'))?.appendChild(btn);

  overlay = document.createElement('div');
  overlay.id = 'sockets-overlay';
  overlay.className = 'hidden';
  overlay.innerHTML = `
    <div id="sockets-panel">
      <div id="sockets-header">
        <h2>Jewelcraft <span id="sockets-free" class="dim"></span></h2>
        <button id="btn-close-sockets" type="button" title="Close">✕</button>
      </div>
      <div id="sockets-body"></div>
    </div>`;
  document.body.appendChild(overlay);

  const open = () => { renderSockets(state); overlay.classList.remove('hidden'); };
  const close = () => overlay.classList.add('hidden');
  btn.addEventListener('click', open);
  $('btn-close-sockets').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
}
